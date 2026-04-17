-- Trigger function: auto-resolve EMR queue entries when appointment hits terminal status
CREATE OR REPLACE FUNCTION public.auto_resolve_emr_queue_on_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  normalized_status text;
BEGIN
  IF NEW.status IS NULL THEN
    RETURN NEW;
  END IF;

  normalized_status := LOWER(TRIM(NEW.status));

  IF normalized_status IN (
    'cancelled', 'canceled',
    'no show', 'noshow', 'no-show',
    'oon',
    'do not call', 'donotcall',
    'rescheduled',
    'won'
  ) THEN
    UPDATE public.emr_processing_queue
    SET 
      status = 'completed',
      processed_at = COALESCE(processed_at, now()),
      notes = COALESCE(notes, '') ||
              CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE E'\n' END ||
              'Auto-resolved: appointment ' || NEW.status,
      updated_at = now()
    WHERE appointment_id = NEW.id
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if present (idempotent re-runs)
DROP TRIGGER IF EXISTS trg_auto_resolve_emr_queue_on_terminal_status ON public.all_appointments;

-- Fire AFTER UPDATE of status
CREATE TRIGGER trg_auto_resolve_emr_queue_on_terminal_status
AFTER UPDATE OF status ON public.all_appointments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.auto_resolve_emr_queue_on_terminal_status();