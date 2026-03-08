
CREATE TABLE public.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  punch_in_time timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'Present',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all attendance
CREATE POLICY "Authenticated users can view attendance"
ON public.attendance_logs FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

-- Users can punch in for themselves
CREATE POLICY "Users can insert own attendance"
ON public.attendance_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_approved_member(auth.uid()));

-- Founders can update attendance records
CREATE POLICY "Founders can update attendance"
ON public.attendance_logs FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
