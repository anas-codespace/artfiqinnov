
-- Create leave_requests table
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewer_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own leave requests
CREATE POLICY "Users can view own leave requests"
  ON public.leave_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Founders can view all leave requests
CREATE POLICY "Founders can view all leave requests"
  ON public.leave_requests FOR SELECT
  USING (is_admin(auth.uid()));

-- Approved members can create their own leave requests
CREATE POLICY "Members can create leave requests"
  ON public.leave_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_approved_member(auth.uid()));

-- Founders can update leave requests (approve/reject)
CREATE POLICY "Founders can update leave requests"
  ON public.leave_requests FOR UPDATE
  USING (is_admin(auth.uid()));

-- Users can delete their own pending requests
CREATE POLICY "Users can delete own pending requests"
  ON public.leave_requests FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
