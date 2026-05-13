
-- 1. Attendance
DROP POLICY IF EXISTS "Authenticated users can view attendance" ON public.attendance_logs;
CREATE POLICY "Users can view own attendance"
  ON public.attendance_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all attendance"
  ON public.attendance_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 2. profiles_safe view
CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker = true) AS
SELECT
  id, user_id, created_at, updated_at, display_name, avatar_url, access_status,
  CASE
    WHEN auth.uid() = user_id THEN email
    WHEN public.is_admin(auth.uid()) THEN email
    ELSE NULL
  END AS email,
  department, posting
FROM public.profiles;

-- 3. Drop sensitive columns
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS admin_pin,
  DROP COLUMN IF EXISTS security_question,
  DROP COLUMN IF EXISTS security_answer;

-- Ensure unique constraint on admin_pins.user_id for upsert
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_pins_user_id_key') THEN
    ALTER TABLE public.admin_pins ADD CONSTRAINT admin_pins_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 4. Rewrite setup_admin_pin to write hashed values into admin_pins
CREATE OR REPLACE FUNCTION public.setup_admin_pin(_pin text, _security_answer text, _security_question text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can set up an admin PIN';
  END IF;

  INSERT INTO public.admin_pins (user_id, pin_hash, security_question, security_answer_hash)
  VALUES (
    auth.uid(),
    extensions.crypt(_pin, extensions.gen_salt('bf')),
    _security_question,
    extensions.crypt(lower(_security_answer), extensions.gen_salt('bf'))
  )
  ON CONFLICT (user_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        security_question = EXCLUDED.security_question,
        security_answer_hash = EXCLUDED.security_answer_hash,
        updated_at = now();

  UPDATE public.profiles SET is_admin_setup_complete = true WHERE user_id = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_admin_pin(_user_id uuid, _pin text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_pins
    WHERE user_id = _user_id
      AND (pin_hash = _pin OR pin_hash = extensions.crypt(_pin, pin_hash))
  )
$function$;

CREATE OR REPLACE FUNCTION public.verify_security_answer(_user_id uuid, _answer text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_pins
    WHERE user_id = _user_id
      AND (
        lower(security_answer_hash) = lower(_answer)
        OR security_answer_hash = extensions.crypt(lower(_answer), security_answer_hash)
      )
  )
$function$;

-- 5. Tighten profile self-update
DROP POLICY IF EXISTS "Users can update own safe profile fields" ON public.profiles;
CREATE POLICY "Users can update own safe profile fields"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND access_status IS NOT DISTINCT FROM (SELECT p.access_status FROM public.profiles p WHERE p.user_id = auth.uid())
    AND is_admin_setup_complete IS NOT DISTINCT FROM (SELECT p.is_admin_setup_complete FROM public.profiles p WHERE p.user_id = auth.uid())
  );

-- 6. Vault storage private + role-based delete
UPDATE storage.buckets SET public = false WHERE id = 'vault';

DROP POLICY IF EXISTS "Allow Public View" ON storage.objects;
CREATE POLICY "Authenticated users can view vault"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vault');

DROP POLICY IF EXISTS "Founder and Owner Delete Access" ON storage.objects;
CREATE POLICY "Owner or admins can delete vault files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vault' AND (auth.uid() = owner OR public.is_admin(auth.uid())));

-- 7. Per-user folder enforcement on uploads
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
CREATE POLICY "Users can upload files to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Users can upload documents to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
