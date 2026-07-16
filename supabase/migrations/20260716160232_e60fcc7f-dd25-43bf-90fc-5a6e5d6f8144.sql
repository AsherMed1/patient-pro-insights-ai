CREATE OR REPLACE FUNCTION public.qa_ingest_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_status text;
  old_status text;
  alert_type text;
  appt_ts timestamptz;
BEGIN
  BEGIN
    new_status := LOWER(TRIM(COALESCE(NEW.status, '')));
    old_status := LOWER(TRIM(COALESCE(OLD.status, '')));
    IF new_status = old_status THEN
      RETURN NEW;
    END IF;

    IF new_status = 'oon' THEN
      alert_type := 'oon';
    ELSIF new_status IN ('cancelled','canceled') AND COALESCE(OLD.was_ever_confirmed, false) = true THEN
      alert_type := 'cancelled';
    ELSIF new_status IN ('no show','noshow','no-show') AND COALESCE(OLD.was_ever_confirmed, false) = true THEN
      alert_type := 'no_show';
    ELSE
      RETURN NEW;
    END IF;

    appt_ts := CASE WHEN NEW.date_of_appointment IS NOT NULL
                    THEN (NEW.date_of_appointment::text || ' ' || COALESCE(NEW.requested_time, '00:00:00'))::timestamptz
                    ELSE NULL END;

    PERFORM public.qa_upsert_case(
      NEW.id,
      NEW.ghl_id,
      NEW.project_name,
      NEW.lead_name,
      NEW.calendar_name,
      appt_ts,
      NEW.status,
      alert_type,
      NULL,
      format('Status changed to %s', NEW.status)
    );
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.security_audit_log (event_type, details)
      VALUES ('qa_ingest_failed', jsonb_build_object(
        'appointment_id', NEW.id,
        'lead_name', NEW.lead_name,
        'project_name', NEW.project_name,
        'new_status', NEW.status,
        'sqlstate', SQLSTATE,
        'sqlerrm', SQLERRM
      ));
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;

  RETURN NEW;
END;
$function$;