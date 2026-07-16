
-- Make QA queue ingestion trigger fault-tolerant so it never aborts an appointment status update.
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
      COALESCE(NEW.procedure_type, NEW.calendar_name),
      appt_ts,
      NEW.status,
      alert_type,
      NULL,
      format('Status changed to %s', NEW.status)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Never block a clinical status change. Log and move on.
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

-- Also harden qa_upsert_case with an outer safety net.
CREATE OR REPLACE FUNCTION public.qa_upsert_case(
  _appointment_id uuid,
  _ghl_contact_id text,
  _project_name text,
  _patient_name text,
  _service_line text,
  _appointment_date timestamptz,
  _appointment_status text,
  _alert_type text,
  _alert_source_id uuid,
  _activity_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_id uuid;
  new_id uuid;
BEGIN
  IF _project_name IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    SELECT id INTO existing_id
    FROM public.qa_cases
    WHERE alert_type = _alert_type
      AND workflow_status <> 'completed'
      AND (
        (_appointment_id IS NOT NULL AND appointment_id = _appointment_id)
        OR (_appointment_id IS NULL AND _ghl_contact_id IS NOT NULL AND ghl_contact_id = _ghl_contact_id)
      )
    ORDER BY entered_queue_at DESC
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
      UPDATE public.qa_cases
        SET last_alert_activity_at = now(),
            appointment_status = COALESCE(_appointment_status, appointment_status),
            appointment_date = COALESCE(_appointment_date, appointment_date),
            patient_name = COALESCE(_patient_name, patient_name),
            service_line = COALESCE(_service_line, service_line),
            updated_at = now()
        WHERE id = existing_id;

      INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
      VALUES (existing_id, 'alert_repeat', COALESCE(_activity_description, 'Repeat alert'),
              jsonb_build_object('alert_type', _alert_type, 'alert_source_id', _alert_source_id));

      RETURN existing_id;
    END IF;

    SELECT id INTO existing_id
    FROM public.qa_cases
    WHERE alert_type = _alert_type
      AND workflow_status = 'completed'
      AND (
        (_appointment_id IS NOT NULL AND appointment_id = _appointment_id)
        OR (_appointment_id IS NULL AND _ghl_contact_id IS NOT NULL AND ghl_contact_id = _ghl_contact_id)
      )
    ORDER BY completed_at DESC
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
      UPDATE public.qa_cases
        SET workflow_status = 'reopened',
            last_alert_activity_at = now(),
            appointment_status = COALESCE(_appointment_status, appointment_status),
            updated_at = now()
        WHERE id = existing_id;

      INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
      VALUES (existing_id, 'reopened', 'Case reopened due to new activity',
              jsonb_build_object('alert_type', _alert_type, 'alert_source_id', _alert_source_id));

      RETURN existing_id;
    END IF;

    INSERT INTO public.qa_cases (
      appointment_id, ghl_contact_id, project_name, patient_name, service_line,
      appointment_date, appointment_status, alert_type, alert_source_id
    ) VALUES (
      _appointment_id, _ghl_contact_id, _project_name, _patient_name, _service_line,
      _appointment_date, _appointment_status, _alert_type, _alert_source_id
    )
    RETURNING id INTO new_id;

    INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
    VALUES (new_id, 'created', COALESCE(_activity_description, 'Case created from alert'),
            jsonb_build_object('alert_type', _alert_type, 'alert_source_id', _alert_source_id));

    RETURN new_id;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.security_audit_log (event_type, details)
      VALUES ('qa_upsert_case_failed', jsonb_build_object(
        'appointment_id', _appointment_id,
        'project_name', _project_name,
        'alert_type', _alert_type,
        'sqlstate', SQLSTATE,
        'sqlerrm', SQLERRM
      ));
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RETURN NULL;
  END;
END;
$function$;

-- Add missing GRANTs on QA tables so future non-trigger code paths work correctly.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qa_cases         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qa_case_activity TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qa_case_notes    TO authenticated;
GRANT ALL ON public.qa_cases         TO service_role;
GRANT ALL ON public.qa_case_activity TO service_role;
GRANT ALL ON public.qa_case_notes    TO service_role;
