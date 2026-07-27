CREATE OR REPLACE FUNCTION public.qa_ingest_terminal_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_status text;
  old_status text;
  appt_ts timestamptz;
  metric_kind text;
  alert_kind text;
BEGIN
  BEGIN
    new_status := LOWER(TRIM(COALESCE(NEW.status, '')));
    old_status := LOWER(TRIM(COALESCE(OLD.status, '')));
    IF new_status = old_status THEN
      RETURN NEW;
    END IF;

    appt_ts := public.qa_build_appt_ts(NEW.project_name, NEW.date_of_appointment, NEW.requested_time);

    IF new_status = 'oon' THEN
      PERFORM public.qa_upsert_case(
        NEW.id, NEW.ghl_id, NEW.project_name, NEW.lead_name,
        NEW.calendar_name, appt_ts, NEW.status, 'oon', NULL,
        format('Status changed to %s', NEW.status)
      );
    ELSIF new_status IN ('cancelled','canceled') THEN
      alert_kind := 'cancelled';
      IF COALESCE(OLD.was_ever_confirmed, false) = true THEN
        metric_kind := 'cancelled';
      END IF;
    ELSIF new_status IN ('no show','noshow','no-show') THEN
      alert_kind := 'no_show';
      IF COALESCE(OLD.was_ever_confirmed, false) = true THEN
        metric_kind := 'no_show';
      END IF;
    END IF;

    IF alert_kind IS NOT NULL AND NEW.project_name IS NOT NULL THEN
      PERFORM public.qa_upsert_case(
        NEW.id, NEW.ghl_id, NEW.project_name, NEW.lead_name,
        NEW.calendar_name, appt_ts, NEW.status, alert_kind, NULL,
        format('Status changed to %s', NEW.status)
      );
    END IF;

    IF metric_kind IS NOT NULL AND NEW.project_name IS NOT NULL THEN
      INSERT INTO public.qa_metrics_events (
        appointment_id, project_name, patient_name, event_type,
        appointment_status, appointment_date, was_ever_confirmed
      ) VALUES (
        NEW.id, NEW.project_name, NEW.lead_name, metric_kind,
        NEW.status, appt_ts, COALESCE(OLD.was_ever_confirmed, false)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.security_audit_log (event_type, details)
      VALUES ('qa_ingest_failed', jsonb_build_object(
        'appointment_id', NEW.id, 'lead_name', NEW.lead_name,
        'project_name', NEW.project_name, 'new_status', NEW.status,
        'sqlstate', SQLSTATE, 'sqlerrm', SQLERRM
      ));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  RETURN NEW;
END;
$function$;