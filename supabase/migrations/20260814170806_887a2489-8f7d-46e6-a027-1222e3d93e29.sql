ALTER TABLE public.qa_cases ADD COLUMN IF NOT EXISTS appointment_created_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_qa_cases_appointment_created_at
  ON public.qa_cases (appointment_created_at DESC);

CREATE OR REPLACE FUNCTION public.qa_cases_set_appointment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  appt_created timestamptz;
BEGIN
  IF NEW.appointment_created_at IS NULL THEN
    IF NEW.appointment_id IS NOT NULL THEN
      SELECT a.date_appointment_created
        INTO appt_created
      FROM public.all_appointments a
      WHERE a.id = NEW.appointment_id;
    END IF;

    NEW.appointment_created_at := COALESCE(
      appt_created,
      NEW.first_entered_at,
      NEW.entered_queue_at,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qa_cases_set_appointment_created ON public.qa_cases;
CREATE TRIGGER trg_qa_cases_set_appointment_created
  BEFORE INSERT OR UPDATE ON public.qa_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.qa_cases_set_appointment_created();