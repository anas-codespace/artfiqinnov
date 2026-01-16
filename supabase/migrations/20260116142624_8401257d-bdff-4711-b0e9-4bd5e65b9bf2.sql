-- Fix overly permissive DELETE policy on messages table
-- Remove the policy that allows any authenticated user to delete any message

DROP POLICY IF EXISTS "Users can delete their own messages for cleanup" ON public.messages;

-- Create a proper policy that only allows users to delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
USING (auth.uid() = user_id);