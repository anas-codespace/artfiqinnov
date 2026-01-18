-- Update tasks table RLS policies for role-based access control

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;

-- Create new policy: Only CEO/CTO can create tasks
CREATE POLICY "Only founders can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('ceo', 'cto')
  )
);

-- Create new policy: Only CEO/CTO can delete tasks
CREATE POLICY "Only founders can delete tasks" 
ON public.tasks 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('ceo', 'cto')
  )
);

-- Update notifications table to allow founders to insert notifications
DROP POLICY IF EXISTS "Only service role can insert notifications" ON public.notifications;

CREATE POLICY "Founders can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('ceo', 'cto')
  )
);