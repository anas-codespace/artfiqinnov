
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS blood_group TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS star_of_the_week_count INTEGER DEFAULT 0;

-- Mark existing founders as profile complete so they aren't blocked
UPDATE public.profiles 
SET is_profile_complete = true 
WHERE email IN ('sulaiman.artfiqceo@gmail.com', 'anas.md.artfiq@gmail.com', 'asvidha.artfiq@gmail.com');
