
-- 1. Fix profile self-escalation: restrict non-admins from changing access_status
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update own safe profile fields"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    -- Either user is admin (can change anything)
    public.is_admin(auth.uid())
    -- Or access_status is not being changed
    OR access_status IS NOT DISTINCT FROM (SELECT p.access_status FROM public.profiles p WHERE p.user_id = auth.uid())
  )
);

-- 2. Fix founder_alerts INSERT: enforce ownership
DROP POLICY IF EXISTS "Authenticated users can create founder alerts" ON public.founder_alerts;

CREATE POLICY "Authenticated users can create founder alerts"
ON public.founder_alerts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = triggered_by);

-- 3. Fix founder_alerts SELECT: restrict to admins only
DROP POLICY IF EXISTS "Authenticated users can view founder alerts" ON public.founder_alerts;

CREATE POLICY "Only founders can view founder alerts"
ON public.founder_alerts FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));
