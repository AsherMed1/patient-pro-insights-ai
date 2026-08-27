CREATE OR REPLACE FUNCTION public.qa_ingest_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_status text;
  old_status text;
  alert_type text;
  lost_type text;
  appt_ts timestamptz;
  poon_case_id uuid;
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

  -- QA Hold: when the OON decision came from a Potential OON alert that the QA
  -- Specialist is already working, do not open/reopen a separate 'oon' case —
  -- that is what pushed completed records back into the New tab.
  IF alert_type = 'oon' THEN
    SELECT id INTO poon_case_id
    FROM public.qa_cases
    WHERE appointment_id = NEW.id
      AND alert_type = 'potential_oon'
      AND (
        workflow_status <> 'completed'
        OR COALESCE(completed_at, last_alert_activity_at) > now() - interval '7 days'
      )
    ORDER BY entered_queue_at DESC
    LIMIT 1;

    IF poon_case_id IS NOT NULL THEN
      INSERT INTO public.qa_case_activity (case_id, activity_type, description)
      VALUES (
        poon_case_id,
        'status_change',
        format('Appointment status changed to %s (handled on this Potential OON record)', NEW.status)
      );
      RETURN NEW;
    END IF;
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

  IF alert_type IN ('cancelled', 'no_show') THEN
    lost_type := CASE WHEN alert_type = 'cancelled' THEN 'cancelled' ELSE 'no_show' END;
    PERFORM public.recapture_upsert_case(
      NEW.id,
      NEW.ghl_id,
      NEW.project_name,
      NEW.lead_name,
      NEW.lead_phone_number,
      NEW.lead_email,
      NEW.calendar_name,
      lost_type,
      NEW.status,
      appt_ts
    );
  END IF;

  RETURN NEW;
END;
$$;