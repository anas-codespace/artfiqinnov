-- Fix the handle_new_user function to handle conflicts properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_display_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Validate and limit display_name length to 100 characters
  v_display_name := LEFT(COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  ), 100);
  
  -- Get avatar_url (validation happens at application level)
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );
  
  INSERT INTO public.profiles (user_id, display_name, avatar_url, email)
  VALUES (NEW.id, v_display_name, v_avatar_url, NEW.email)
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    email = EXCLUDED.email,
    updated_at = now();
  
  RETURN NEW;
END;
$function$;

-- Ensure there's a unique constraint on user_id in profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_user_id_key' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Ensure there's a unique constraint on user_id in user_roles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_key' 
    AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END $$;