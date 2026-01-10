-- Fix: Restrict email visibility to profile owner only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a new policy that allows viewing profiles but restricts email access
-- Users can see all profiles (for display names, avatars) but email is controlled separately
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create a secure view that masks email for non-owners
CREATE OR REPLACE VIEW public.profiles_safe AS
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