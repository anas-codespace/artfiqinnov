CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT id, user_id, created_at, updated_at, display_name, avatar_url, access_status, email, department, posting
FROM public.profiles;