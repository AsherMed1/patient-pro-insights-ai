CREATE OR REPLACE FUNCTION public.qa_sync_appointment_status_from_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.qa_cases
       SET appointment_status = NEW.status,
           updated_at = now()
     WHERE appointment_id = NEW.id
       AND appointment_status IS DISTINCT FROM NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qa_sync_appointment_status ON public.all_appointments;
CREATE TRIGGER trg_qa_sync_appointment_status
AFTER UPDATE OF status ON public.all_appointments
FOR EACH ROW
EXECUTE FUNCTION public.qa_sync_appointment_status_from_appointment();

UPDATE public.qa_cases c
   SET appointment_status = a.status,
       updated_at = now()
  FROM public.all_appointments a
 WHERE a.id = c.appointment_id
   AND c.appointment_status IS DISTINCT FROM a.status;