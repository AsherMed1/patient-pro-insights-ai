ALTER TABLE public.qa_note_mentions
  ADD COLUMN IF NOT EXISTS recapture_case_id uuid REFERENCES public.recapture_cases(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_qa_note_mentions_recapture_case
  ON public.qa_note_mentions (recapture_case_id) WHERE recapture_case_id IS NOT NULL;

-- One follow-up-due reminder per case per scheduled time
CREATE UNIQUE INDEX IF NOT EXISTS uq_qa_note_mentions_followup_due
  ON public.qa_note_mentions (recapture_case_id, mentioned_user_id, kind, title)
  WHERE kind = 'recapture_follow_up_due';