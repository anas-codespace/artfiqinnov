
-- Create notice_board table
CREATE TABLE public.notice_board (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  media_url text,
  media_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.notice_board ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view
CREATE POLICY "Authenticated users can view notices"
  ON public.notice_board FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only founders can insert
CREATE POLICY "Only founders can create notices"
  ON public.notice_board FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Only founders can delete
CREATE POLICY "Only founders can delete notices"
  ON public.notice_board FOR DELETE
  USING (is_admin(auth.uid()));

-- Only founders can update
CREATE POLICY "Only founders can update notices"
  ON public.notice_board FOR UPDATE
  USING (is_admin(auth.uid()));

-- Create notices storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('notices', 'notices', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for notices bucket
CREATE POLICY "Anyone can view notice files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'notices');

CREATE POLICY "Founders can upload notice files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'notices' AND is_admin(auth.uid()));

CREATE POLICY "Founders can delete notice files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'notices' AND is_admin(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notice_board;
