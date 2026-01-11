-- 1. Create private schema for secure configuration
CREATE SCHEMA IF NOT EXISTS private;

-- 2. Create secure founder emails config table
CREATE TABLE IF NOT EXISTS private.founder_emails (
  email TEXT PRIMARY KEY,
  role public.app_role NOT NULL
);

-- Revoke all access from public and authenticated roles
REVOKE ALL ON private.founder_emails FROM public, authenticated;

-- Insert founder emails (this is secure because private schema is not accessible)
INSERT INTO private.founder_emails (email, role)
VALUES 
  ('mohammedsulaimanofficial@gmail.com', 'ceo'),
  ('anas.m77581@gmail.com', 'cto')
ON CONFLICT (email) DO NOTHING;

-- 3. Update the assign_role_on_signup function to use the private config table
CREATE OR REPLACE FUNCTION public.assign_role_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  -- Look up role from private config table
  SELECT role INTO v_role 
  FROM private.founder_emails 
  WHERE email = NEW.email;
  
  -- Default to team if no founder match
  IF v_role IS NULL THEN
    v_role := 'team';
  END IF;

  -- Insert into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 4. Add length constraints for tasks table
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_title_length CHECK (char_length(title) <= 200);

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_description_length CHECK (char_length(description) <= 2000);

-- 5. Add length constraints for events table
ALTER TABLE public.events
ADD CONSTRAINT events_title_length CHECK (char_length(title) <= 200);

ALTER TABLE public.events
ADD CONSTRAINT events_description_length CHECK (char_length(description) <= 2000);