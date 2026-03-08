
-- Update founder emails in private.founder_emails
UPDATE private.founder_emails SET email = 'sulaiman.artfiqceo@gmail.com' WHERE email = 'mohammedsulaimanofficial@gmail.com';
UPDATE private.founder_emails SET email = 'anas.md.artfiq@gmail.com' WHERE email = 'anas.m77581@gmail.com';

-- Recreate the trigger function with updated emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_access_status text;
  v_display_name text;
BEGIN
  -- Determine role based on email
  IF NEW.email = 'sulaiman.artfiqceo@gmail.com' THEN
    v_role := 'ceo';
    v_access_status := 'approved_member';
    v_display_name := 'Sulaiman';
  ELSIF NEW.email = 'anas.md.artfiq@gmail.com' THEN
    v_role := 'cto';
    v_access_status := 'approved_member';
    v_display_name := 'Anas';
  ELSE
    v_role := 'team';
    v_access_status := 'visitor';
    v_display_name := split_part(NEW.email, '@', 1);
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (user_id, email, display_name, access_status)
  VALUES (NEW.id, NEW.email, v_display_name, v_access_status)
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
