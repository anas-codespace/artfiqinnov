
-- Drop and recreate the view with email masking
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe WITH (security_invoker = on) AS
SELECT
  id, user_id, created_at, updated_at, display_name,
  avatar_url, access_status,
  CASE
    WHEN auth.uid() = user_id THEN email
    WHEN public.is_admin(auth.uid()) THEN email
    ELSE NULL
  END AS email,
  department, posting
FROM public.profiles;
