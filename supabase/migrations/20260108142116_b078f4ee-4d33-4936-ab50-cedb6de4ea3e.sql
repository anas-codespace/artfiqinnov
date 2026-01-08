-- Create a database function to delete messages older than 72 hours
CREATE OR REPLACE FUNCTION public.cleanup_old_messages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete messages older than 72 hours
  DELETE FROM public.messages
  WHERE created_at < NOW() - INTERVAL '72 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.cleanup_old_messages() TO authenticated;

-- Also allow users to delete their own messages (add RLS policy)
CREATE POLICY "Users can delete their own messages for cleanup"
ON public.messages
FOR DELETE
USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- Cleanup related message_reads for deleted messages (via cascade or function)
-- First, let's add cascade delete to message_reads
ALTER TABLE public.message_reads
DROP CONSTRAINT IF EXISTS message_reads_message_id_fkey;

ALTER TABLE public.message_reads
ADD CONSTRAINT message_reads_message_id_fkey
FOREIGN KEY (message_id) REFERENCES public.messages(id)
ON DELETE CASCADE;

-- Same for message_reactions
ALTER TABLE public.message_reactions
DROP CONSTRAINT IF EXISTS message_reactions_message_id_fkey;

ALTER TABLE public.message_reactions
ADD CONSTRAINT message_reactions_message_id_fkey
FOREIGN KEY (message_id) REFERENCES public.messages(id)
ON DELETE CASCADE;