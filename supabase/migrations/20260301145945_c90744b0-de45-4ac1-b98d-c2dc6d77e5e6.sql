
-- Create pitches table for the Innovation Lab
CREATE TABLE public.pitches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  author_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  votes_up INT NOT NULL DEFAULT 0,
  votes_down INT NOT NULL DEFAULT 0,
  feedback TEXT,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add department column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT DEFAULT NULL;

-- Enable RLS on pitches
ALTER TABLE public.pitches ENABLE ROW LEVEL SECURITY;

-- Policies for pitches
CREATE POLICY "Authenticated users can view all pitches"
  ON public.pitches FOR SELECT
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Approved members can create pitches"
  ON public.pitches FOR INSERT
  WITH CHECK (auth.uid() = author_id AND is_approved_member(auth.uid()));

CREATE POLICY "Only founders can update pitches"
  ON public.pitches FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Only founders can delete pitches"
  ON public.pitches FOR DELETE
  USING (is_admin(auth.uid()));

-- Allow authors to update their own pending pitches
CREATE POLICY "Authors can update own pending pitches"
  ON public.pitches FOR UPDATE
  USING (auth.uid() = author_id AND status = 'pending');

-- Trigger for updated_at
CREATE TRIGGER update_pitches_updated_at
  BEFORE UPDATE ON public.pitches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for pitches
ALTER PUBLICATION supabase_realtime ADD TABLE public.pitches;
