-- Star of the Week table
CREATE TABLE public.star_of_week (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nominated_by UUID NOT NULL,
  week_start DATE NOT NULL,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.star_of_week ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view star of week"
  ON public.star_of_week FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert star of week"
  ON public.star_of_week FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update star of week"
  ON public.star_of_week FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete star of week"
  ON public.star_of_week FOR DELETE
  USING (is_admin(auth.uid()));

-- Activity Feed table
CREATE TABLE public.activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID NOT NULL,
  actor_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view activity feed"
  ON public.activity_feed FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert own activities"
  ON public.activity_feed FOR INSERT
  WITH CHECK (auth.uid() = actor_id);

-- Enable realtime for activity feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;

-- Daily Work Logs table (punch-out summaries)
CREATE TABLE public.daily_work_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_work_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own work logs"
  ON public.daily_work_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all work logs"
  ON public.daily_work_logs FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own work logs"
  ON public.daily_work_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own work logs"
  ON public.daily_work_logs FOR UPDATE
  USING (auth.uid() = user_id);