CREATE OR REPLACE FUNCTION public.recapture_mark_recovered_on_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    changed := NEW.recaptured_from_appointment_id IS NOT NULL;
  ELSE
    changed := NEW.recaptured_from_appointment_id IS DISTINCT FROM OLD.recaptured_from_appointment_id;
  END IF;

  IF changed AND NEW.recaptured_from_appointment_id IS NOT NULL THEN
    UPDATE public.recapture_cases
    SET recovered = true,
        rebooked_appointment_id = NEW.id,
        work_status = 'completed',
        outcome = COALESCE(outcome, 'rebooked'),
        completed_at = COALESCE(completed_at, now()),
        updated_at = now()
    WHERE appointment_id = NEW.recaptured_from_appointment_id
      AND recovered = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recapture_mark_recovered_on_link_trg ON public.all_appointments;
CREATE TRIGGER recapture_mark_recovered_on_link_trg
AFTER INSERT OR UPDATE OF recaptured_from_appointment_id ON public.all_appointments
FOR EACH ROW EXECUTE FUNCTION public.recapture_mark_recovered_on_link();