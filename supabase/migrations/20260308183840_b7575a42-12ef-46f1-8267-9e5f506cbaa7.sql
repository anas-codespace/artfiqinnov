
-- Add punch_out_time to attendance_logs
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS punch_out_time timestamp with time zone DEFAULT NULL;

-- Add work_duration_minutes to attendance_logs (computed on checkout)
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS work_duration_minutes integer DEFAULT NULL;
