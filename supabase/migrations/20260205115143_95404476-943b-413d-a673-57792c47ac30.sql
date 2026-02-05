-- Create table for admin PIN authentication
CREATE TABLE public.admin_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  security_question TEXT NOT NULL,
  security_answer_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_pins ENABLE ROW LEVEL SECURITY;

-- Only the owner can view their own PIN record
CREATE POLICY "Users can view their own PIN"
ON public.admin_pins
FOR SELECT
USING (auth.uid() = user_id);

-- Only founders can insert their PIN
CREATE POLICY "Founders can create their PIN"
ON public.admin_pins
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  is_admin(auth.uid())
);

-- Only the owner can update their PIN
CREATE POLICY "Users can update their own PIN"
ON public.admin_pins
FOR UPDATE
USING (auth.uid() = user_id AND is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_admin_pins_updated_at
BEFORE UPDATE ON public.admin_pins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to verify PIN (using simple comparison - in production use proper hashing)
CREATE OR REPLACE FUNCTION public.verify_admin_pin(_user_id UUID, _pin TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_pins
    WHERE user_id = _user_id
      AND pin_hash = _pin
  )
$$;

-- Create function to verify security answer
CREATE OR REPLACE FUNCTION public.verify_security_answer(_user_id UUID, _answer TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_pins
    WHERE user_id = _user_id
      AND LOWER(security_answer_hash) = LOWER(_answer)
  )
$$;