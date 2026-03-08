
-- Create vault_access_requests table
CREATE TABLE public.vault_access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, file_id)
);

-- Enable RLS
ALTER TABLE public.vault_access_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own vault access requests"
  ON public.vault_access_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Founders can view all requests
CREATE POLICY "Founders can view all vault access requests"
  ON public.vault_access_requests FOR SELECT
  USING (is_admin(auth.uid()));

-- Authenticated users can create requests for themselves
CREATE POLICY "Users can create vault access requests"
  ON public.vault_access_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Founders can update requests (approve/reject)
CREATE POLICY "Founders can update vault access requests"
  ON public.vault_access_requests FOR UPDATE
  USING (is_admin(auth.uid()));

-- Users can delete own pending requests
CREATE POLICY "Users can delete own pending vault requests"
  ON public.vault_access_requests FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_access_requests;
