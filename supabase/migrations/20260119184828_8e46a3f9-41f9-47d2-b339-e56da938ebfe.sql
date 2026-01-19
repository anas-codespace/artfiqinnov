-- Add access_status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS access_status text DEFAULT 'visitor' 
CHECK (access_status IN ('visitor', 'pending', 'approved_member'));

-- Update existing founder profiles to approved_member (based on user_roles)
UPDATE public.profiles 
SET access_status = 'approved_member' 
WHERE user_id IN (
  SELECT user_id FROM public.user_roles 
  WHERE role IN ('ceo', 'cto')
);

-- Create function to check if user is approved member
CREATE OR REPLACE FUNCTION public.is_approved_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND access_status = 'approved_member'
  )
$$;

-- Create function to check if user is admin (CEO/CTO)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('ceo', 'cto')
  )
$$;

-- Create function to get user access status
CREATE OR REPLACE FUNCTION public.get_access_status(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(access_status, 'visitor')
  FROM public.profiles
  WHERE user_id = _user_id
$$;

-- Drop existing RLS policies that need to be updated

-- MESSAGES: Only approved members can INSERT
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;
CREATE POLICY "Approved members can insert messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND public.is_approved_member(auth.uid())
);

-- EVENTS: Only approved members can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can update events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can delete events" ON public.events;

CREATE POLICY "Approved members can create events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (public.is_approved_member(auth.uid()));

CREATE POLICY "Approved members can update events"
ON public.events
FOR UPDATE
TO authenticated
USING (public.is_approved_member(auth.uid()));

CREATE POLICY "Approved members can delete events"
ON public.events
FOR DELETE
TO authenticated
USING (public.is_approved_member(auth.uid()));

-- FILES: Only approved members can INSERT/DELETE
DROP POLICY IF EXISTS "Authenticated users can insert files" ON public.files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.files;

CREATE POLICY "Approved members can insert files"
ON public.files
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by 
  AND public.is_approved_member(auth.uid())
);

CREATE POLICY "Approved members can delete their own files"
ON public.files
FOR DELETE
TO authenticated
USING (
  auth.uid() = uploaded_by 
  AND public.is_approved_member(auth.uid())
);

-- MESSAGE_REACTIONS: Only approved members can INSERT/DELETE
DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove their reactions" ON public.message_reactions;

CREATE POLICY "Approved members can add reactions"
ON public.message_reactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND public.is_approved_member(auth.uid())
);

CREATE POLICY "Approved members can remove their reactions"
ON public.message_reactions
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  AND public.is_approved_member(auth.uid())
);

-- TASKS: Only approved members can UPDATE (already founders-only for INSERT/DELETE)
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
CREATE POLICY "Approved members can update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (public.is_approved_member(auth.uid()));

-- NOTIFICATIONS: Allow users to insert their own access request notifications
DROP POLICY IF EXISTS "Founders can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert access request notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admins can create any notification
  public.is_admin(auth.uid())
  OR
  -- Non-admins can only create notifications targeting admins (access requests)
  (user_id IN (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('ceo', 'cto')))
);

-- PROFILES: Admins can update any profile (for approving users)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Recreate profiles_safe view to include access_status
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  created_at,
  updated_at,
  access_status,
  CASE 
    WHEN auth.uid() = user_id THEN email
    WHEN public.is_admin(auth.uid()) THEN email
    ELSE NULL
  END as email
FROM public.profiles;