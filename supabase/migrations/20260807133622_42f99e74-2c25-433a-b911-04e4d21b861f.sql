ALTER TABLE public.qa_cases
  ADD COLUMN IF NOT EXISTS escalation_status text,
  ADD COLUMN IF NOT EXISTS escalated_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_owner_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_qa_cases_escalation
  ON public.qa_cases (escalation_status, escalation_owner_user_id);

CREATE OR REPLACE FUNCTION public.qa_cases_escalation_status_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.workflow_status = 'completed' AND COALESCE(OLD.workflow_status,'') <> 'completed' THEN
    IF NEW.escalation_status IS NOT NULL AND NEW.escalation_status <> 'Resolved' THEN
      NEW.escalation_status := 'Resolved';
    END IF;
    IF NEW.date_resolved IS NULL THEN
      NEW.date_resolved := now();
    END IF;
  END IF;

  IF COALESCE(OLD.workflow_status,'') = 'completed' AND NEW.workflow_status <> 'completed' THEN
    IF NEW.escalation_status IS NOT NULL THEN
      NEW.escalation_status := 'Follow-Up Required';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qa_cases_escalation_status_sync ON public.qa_cases;
CREATE TRIGGER trg_qa_cases_escalation_status_sync
BEFORE UPDATE ON public.qa_cases
FOR EACH ROW EXECUTE FUNCTION public.qa_cases_escalation_status_sync();

ALTER TABLE public.qa_note_mentions
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'mention',
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS body text;

ALTER TABLE public.qa_note_mentions ALTER COLUMN note_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qa_note_mentions_user_kind
  ON public.qa_note_mentions (mentioned_user_id, created_at DESC);