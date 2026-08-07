ALTER TABLE public.qa_note_mentions
  ALTER COLUMN case_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS appointment_id uuid,
  ADD COLUMN IF NOT EXISTS appointment_note_id uuid;

ALTER TABLE public.qa_note_mentions
  ADD CONSTRAINT qa_note_mentions_target_present
  CHECK (case_id IS NOT NULL OR appointment_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_qa_note_mentions_appointment
  ON public.qa_note_mentions (appointment_id);