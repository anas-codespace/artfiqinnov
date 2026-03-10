-- 1. Drop the unique constraint that limits one check-in per day
ALTER TABLE public.attendance_logs DROP CONSTRAINT IF EXISTS attendance_logs_user_id_date_key;

-- 2. Users should also be able to update their own attendance (for punch-out on their own rows)
DROP POLICY IF EXISTS "Users can update own attendance" ON public.attendance_logs;
CREATE POLICY "Users can update own attendance"
ON public.attendance_logs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND is_approved_member(auth.uid()));