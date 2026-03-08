
-- Fix CEO role
UPDATE public.user_roles SET role = 'ceo' WHERE user_id = 'f6a9fd8b-f252-4f5f-a6d7-ffcb7df2617c';

-- Fix CTO role
UPDATE public.user_roles SET role = 'cto' WHERE user_id = '4b9a36da-6a39-4c47-b059-3829029c2158';

-- Ensure both are approved members
UPDATE public.profiles SET access_status = 'approved_member' WHERE user_id IN ('f6a9fd8b-f252-4f5f-a6d7-ffcb7df2617c', '4b9a36da-6a39-4c47-b059-3829029c2158');
