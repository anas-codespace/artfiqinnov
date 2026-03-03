
-- 1. Create pitch_votes table for like/unlike toggle
CREATE TABLE public.pitch_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id uuid NOT NULL REFERENCES public.pitches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote_type text NOT NULL DEFAULT 'up' CHECK (vote_type IN ('up', 'down')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pitch_id, user_id)
);

ALTER TABLE public.pitch_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view votes"
  ON public.pitch_votes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Approved members can vote"
  ON public.pitch_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_approved_member(auth.uid()));

CREATE POLICY "Users can remove their own vote"
  ON public.pitch_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for pitch_votes
ALTER PUBLICATION supabase_realtime ADD TABLE public.pitch_votes;
