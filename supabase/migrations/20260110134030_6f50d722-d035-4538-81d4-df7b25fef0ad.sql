-- Fix the SECURITY DEFINER view issue by using SECURITY INVOKER
DROP VIEW IF EXISTS public.profiles_safe;

-- Recreate view with SECURITY INVOKER (default, explicit for clarity)
CREATE VIEW public.profiles_safe 
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  CASE 
    WHEN auth.uid() = user_id THEN email
    ELSE NULL
  END as email,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_safe TO authenticated;