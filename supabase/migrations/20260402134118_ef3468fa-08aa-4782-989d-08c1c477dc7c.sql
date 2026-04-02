
-- Enable realtime for messages and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS admin_pin TEXT,
ADD COLUMN IF NOT EXISTS security_question TEXT,
ADD COLUMN IF NOT EXISTS security_answer TEXT,
ADD COLUMN IF NOT EXISTS is_admin_setup_complete BOOLEAN DEFAULT false;

-- Update the setup_admin_pin function to include Asvidha
CREATE OR REPLACE FUNCTION public.setup_admin_pin(
    _pin TEXT, 
    _security_answer TEXT, 
    _security_question TEXT
) 
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE profiles 
    SET 
        admin_pin = _pin,
        security_question = _security_question,
        security_answer = _security_answer,
        is_admin_setup_complete = true
    WHERE 
        email IN (
            'sulaiman.artfiqceo@gmail.com', 
            'anas.md.artfiq@gmail.com', 
            'asvidha.artfiq@gmail.com'
        );
END;
$$;
