
-- Create company_holidays table
CREATE TABLE public.company_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL,
  declared_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view holidays
CREATE POLICY "Authenticated users can view holidays"
  ON public.company_holidays FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only founders can insert holidays
CREATE POLICY "Only founders can declare holidays"
  ON public.company_holidays FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Only founders can delete holidays
CREATE POLICY "Only founders can delete holidays"
  ON public.company_holidays FOR DELETE
  USING (is_admin(auth.uid()));
