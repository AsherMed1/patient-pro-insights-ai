
-- 1) One-time backfill: recompute qa_cases.appointment_date from all_appointments
UPDATE public.qa_cases q
   SET appointment_date = public.qa_build_appt_ts(q.project_name, a.date_of_appointment, a.requested_time),
       updated_at = now()
  FROM public.all_appointments a
 WHERE q.appointment_id = a.id
   AND a.date_of_appointment IS NOT NULL
   AND public.qa_build_appt_ts(q.project_name, a.date_of_appointment, a.requested_time)
       IS DISTINCT FROM q.appointment_date;

-- 2) Trigger: keep linked qa_cases in sync when Portal reschedules an appointment
CREATE OR REPLACE FUNCTION public.qa_sync_appt_date_from_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.date_of_appointment IS DISTINCT FROM OLD.date_of_appointment
     OR NEW.requested_time IS DISTINCT FROM OLD.requested_time
     OR NEW.project_name IS DISTINCT FROM OLD.project_name THEN
    UPDATE public.qa_cases
       SET appointment_date = public.qa_build_appt_ts(NEW.project_name, NEW.date_of_appointment, NEW.requested_time),
           updated_at = now()
     WHERE appointment_id = NEW.id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_qa_sync_appt_date_from_appointment ON public.all_appointments;
CREATE TRIGGER trg_qa_sync_appt_date_from_appointment
AFTER UPDATE OF date_of_appointment, requested_time, project_name ON public.all_appointments
FOR EACH ROW EXECUTE FUNCTION public.qa_sync_appt_date_from_appointment();
