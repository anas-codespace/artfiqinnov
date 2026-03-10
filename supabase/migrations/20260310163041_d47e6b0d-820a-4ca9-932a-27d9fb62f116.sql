-- Step 2: Update is_admin() to recognize the 'admin' role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('ceo', 'cto', 'admin')
  )
$$;

-- Add asvidha to private.founder_emails
INSERT INTO private.founder_emails (email, role)
VALUES ('asvidha.artfiq@gmail.com', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Update handle_new_user to handle admin role via private.founder_emails lookup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_access_status text;
  v_display_name text;
BEGIN
  SELECT role INTO v_role 
  FROM private.founder_emails 
  WHERE email = NEW.email;

  IF v_role IS NOT NULL THEN
    v_access_status := 'approved_member';
    v_display_name := split_part(NEW.email, '@', 1);
    IF NEW.email = 'sulaiman.artfiqceo@gmail.com' THEN
      v_display_name := 'Sulaiman';
    ELSIF NEW.email = 'anas.md.artfiq@gmail.com' THEN
      v_display_name := 'Anas';
    ELSIF NEW.email = 'asvidha.artfiq@gmail.com' THEN
      v_display_name := 'Asvidha';
    END IF;
  ELSE
    v_role := 'team';
    v_access_status := 'visitor';
    v_display_name := split_part(NEW.email, '@', 1);
  END IF;

  INSERT INTO public.profiles (user_id, email, display_name, access_status)
  VALUES (NEW.id, NEW.email, v_display_name, v_access_status)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- If asvidha already has an account, update their role and status
UPDATE public.user_roles 
SET role = 'admin'
WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'asvidha.artfiq@gmail.com'
) AND role = 'team';

UPDATE public.profiles
SET access_status = 'approved_member'
WHERE email = 'asvidha.artfiq@gmail.com' AND access_status != 'approved_member';