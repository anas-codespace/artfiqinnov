-- Recreate profiles_safe view with SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  created_at,
  updated_at,
  access_status,
  CASE 
    WHEN auth.uid() = user_id THEN email
    WHEN public.is_admin(auth.uid()) THEN email
    ELSE NULL
  END as email
FROM public.profiles;