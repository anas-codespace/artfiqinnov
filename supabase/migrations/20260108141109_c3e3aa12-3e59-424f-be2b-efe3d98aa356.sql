-- Fix 1: Replace permissive notifications INSERT policy with service_role only
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Only service role can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Fix 2: Update handle_new_user function with input validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
  VALUES (NEW.id, v_display_name, v_avatar_url, NEW.email);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 3: Add message text length constraint using a trigger (more flexible than CHECK)
CREATE OR REPLACE FUNCTION public.validate_message_length()
RETURNS TRIGGER AS $$
BEGIN
  IF char_length(NEW.text) < 1 THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;
  
  IF char_length(NEW.text) > 5000 THEN
    RAISE EXCEPTION 'Message must be less than 5000 characters';
  END IF;
  
  IF char_length(NEW.user_name) > 100 THEN
    NEW.user_name := LEFT(NEW.user_name, 100);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS validate_message_before_insert ON public.messages;

CREATE TRIGGER validate_message_before_insert
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.validate_message_length();