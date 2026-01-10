-- Add rate limiting and role-based access control for cleanup function
-- Create cleanup log table for rate limiting
CREATE TABLE IF NOT EXISTS public.cleanup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on cleanup_log
ALTER TABLE public.cleanup_log ENABLE ROW LEVEL SECURITY;

-- Only founders can see cleanup logs
CREATE POLICY "Founders can view cleanup logs" ON public.cleanup_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('ceo', 'cto')
    )
  );

-- Only founders can insert cleanup logs (via function)
CREATE POLICY "Founders can insert cleanup logs" ON public.cleanup_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('ceo', 'cto')
    )
  );

-- Replace the cleanup function with role-check and rate limiting
CREATE OR REPLACE FUNCTION public.cleanup_old_messages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
  last_run TIMESTAMPTZ;
  caller_role TEXT;
BEGIN
  -- Check if caller is CEO or CTO
  SELECT role INTO caller_role 
  FROM public.user_roles 
  WHERE user_id = auth.uid();
  
  IF caller_role IS NULL OR caller_role NOT IN ('ceo', 'cto') THEN
    RAISE EXCEPTION 'Access denied. Only founders can trigger message cleanup.';
  END IF;
  
  -- Rate limit: once per hour globally
  SELECT MAX(executed_at) INTO last_run FROM public.cleanup_log;
  
  IF last_run IS NOT NULL AND last_run > NOW() - INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'Cleanup already run recently. Try again in an hour.';
  END IF;
  
  -- Delete messages older than 72 hours
  DELETE FROM public.messages
  WHERE created_at < NOW() - INTERVAL '72 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup
  INSERT INTO public.cleanup_log (user_id) VALUES (auth.uid());
  
  RETURN deleted_count;
END;
$$;