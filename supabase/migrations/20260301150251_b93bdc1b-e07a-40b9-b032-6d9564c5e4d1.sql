
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe
WITH (security_invoker=on) AS
  SELECT 
    id,
    user_id,
    created_at,
    updated_at,
    display_name,
    avatar_url,
    access_status,
    email,
    department
  FROM public.profiles;
