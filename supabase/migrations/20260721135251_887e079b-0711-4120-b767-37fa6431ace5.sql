
CREATE OR REPLACE FUNCTION public.qa_ingest_confirmed_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_status text;
  old_status text;
  appt_ts timestamptz;
BEGIN
  BEGIN
    new_status := LOWER(TRIM(COALESCE(NEW.status, '')));

    IF new_status <> 'confirmed' THEN
      RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
      old_status := LOWER(TRIM(COALESCE(OLD.status, '')));
      IF new_status = old_status THEN
        RETURN NEW;
      END IF;
    END IF;

    IF COALESCE(NEW.is_reserved_block, false) = true OR COALESCE(NEW.is_superseded, false) = true THEN
      RETURN NEW;
    END IF;

    IF NEW.review_status IS NOT NULL AND NEW.review_status <> 'approved' THEN
      RETURN NEW;
    END IF;

    appt_ts := CASE WHEN NEW.date_of_appointment IS NOT NULL
                    THEN (NEW.date_of_appointment::text || ' ' || COALESCE(NEW.requested_time, '00:00:00'))::timestamptz
                    ELSE NULL END;

    PERFORM public.qa_upsert_case(
      NEW.id, NEW.ghl_id, NEW.project_name, NEW.lead_name,
      NEW.calendar_name,
      appt_ts, NEW.status, 'confirmed_audit', NULL,
      'Confirmed appointment queued for QA audit'
    );
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.security_audit_log (event_type, details)
      VALUES ('qa_ingest_confirmed_failed', jsonb_build_object(
        'appointment_id', NEW.id, 'sqlstate', SQLSTATE, 'sqlerrm', SQLERRM
      ));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_qa_ingest_confirmed_audit_ins ON public.all_appointments;
CREATE TRIGGER trg_qa_ingest_confirmed_audit_ins
AFTER INSERT ON public.all_appointments
FOR EACH ROW
EXECUTE FUNCTION public.qa_ingest_confirmed_audit();

CREATE OR REPLACE FUNCTION public.qa_ingest_on_review_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  appt_ts timestamptz;
BEGIN
  BEGIN
    IF NEW.review_status IS DISTINCT FROM 'approved' THEN RETURN NEW; END IF;
    IF OLD.review_status IS NOT DISTINCT FROM 'approved' THEN RETURN NEW; END IF;
    IF LOWER(TRIM(COALESCE(NEW.status, ''))) <> 'confirmed' THEN RETURN NEW; END IF;
    IF COALESCE(NEW.is_reserved_block, false) OR COALESCE(NEW.is_superseded, false) THEN RETURN NEW; END IF;

    appt_ts := CASE WHEN NEW.date_of_appointment IS NOT NULL
                    THEN (NEW.date_of_appointment::text || ' ' || COALESCE(NEW.requested_time, '00:00:00'))::timestamptz
                    ELSE NULL END;

    PERFORM public.qa_upsert_case(
      NEW.id, NEW.ghl_id, NEW.project_name, NEW.lead_name,
      NEW.calendar_name,
      appt_ts, NEW.status, 'confirmed_audit', NULL,
      'Confirmed appointment queued for QA audit (review approved)'
    );
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.security_audit_log (event_type, details)
      VALUES ('qa_ingest_review_approval_failed', jsonb_build_object(
        'appointment_id', NEW.id, 'sqlstate', SQLSTATE, 'sqlerrm', SQLERRM
      ));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_qa_ingest_on_review_approval ON public.all_appointments;
CREATE TRIGGER trg_qa_ingest_on_review_approval
AFTER UPDATE OF review_status ON public.all_appointments
FOR EACH ROW
EXECUTE FUNCTION public.qa_ingest_on_review_approval();

-- Backfill last 30 days
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT a.id, a.ghl_id, a.project_name, a.lead_name, a.calendar_name,
           a.date_of_appointment, a.requested_time, a.status
    FROM public.all_appointments a
    WHERE LOWER(TRIM(a.status)) = 'confirmed'
      AND COALESCE(a.is_reserved_block, false) = false
      AND COALESCE(a.is_superseded, false) = false
      AND (a.review_status IS NULL OR a.review_status = 'approved')
      AND a.created_at > now() - interval '30 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.qa_cases q
        WHERE q.appointment_id = a.id AND q.alert_type = 'confirmed_audit'
      )
  LOOP
    BEGIN
      PERFORM public.qa_upsert_case(
        r.id, r.ghl_id, r.project_name, r.lead_name,
        r.calendar_name,
        CASE WHEN r.date_of_appointment IS NOT NULL
             THEN (r.date_of_appointment::text || ' ' || COALESCE(r.requested_time, '00:00:00'))::timestamptz
             ELSE NULL END,
        r.status, 'confirmed_audit', NULL,
        'Confirmed appointment queued for QA audit (backfill)'
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;
