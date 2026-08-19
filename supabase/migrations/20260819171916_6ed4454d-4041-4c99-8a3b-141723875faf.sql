CREATE TABLE public.employee_private_info (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  phone_number text,
  blood_group text,
  address text,
  emergency_contact text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.employee_private_info TO authenticated;
GRANT ALL ON public.employee_private_info TO service_role;

ALTER TABLE public.employee_private_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own private info"
ON public.employee_private_info FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all private info"
ON public.employee_private_info FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own private info"
ON public.employee_private_info FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own private info"
ON public.employee_private_info FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_employee_private_info_updated_at
BEFORE UPDATE ON public.employee_private_info
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.employee_private_info (user_id, phone_number, blood_group, address, emergency_contact)
SELECT user_id, phone_number, blood_group, address, emergency_contact
FROM public.profiles
WHERE phone_number IS NOT NULL
   OR blood_group IS NOT NULL
   OR address IS NOT NULL
   OR emergency_contact IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS phone_number,
  DROP COLUMN IF EXISTS blood_group,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS emergency_contact;
