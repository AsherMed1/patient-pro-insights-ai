CREATE OR REPLACE FUNCTION public.qa_cases_escalation_status_sync()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.workflow_status = 'completed' AND COALESCE(OLD.workflow_status,'') <> 'completed' THEN
    IF NEW.escalation_status IS NOT NULL AND NEW.escalation_status <> 'Resolved' THEN
      NEW.escalation_status := 'Resolved';
    END IF;
    IF NEW.date_resolved IS NULL THEN
      NEW.date_resolved := now();
    END IF;
  END IF;

  -- Reopening no longer rewrites a Resolved escalation: the final escalation
  -- status is history and must stay visible.

  -- Mirror: escalation resolution closes the audit record
  IF NEW.escalation_status = 'Resolved'
     AND COALESCE(OLD.escalation_status,'') <> 'Resolved'
     AND NEW.workflow_status = COALESCE(OLD.workflow_status, NEW.workflow_status)
     AND NEW.workflow_status <> 'completed' THEN
    NEW.workflow_status := 'completed';
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
    IF NEW.date_resolved IS NULL THEN
      NEW.date_resolved := now();
    END IF;
  END IF;

  -- Mirror: reopening the escalation reopens the audit record
  IF COALESCE(OLD.escalation_status,'') = 'Resolved'
     AND NEW.escalation_status IS NOT NULL
     AND NEW.escalation_status <> 'Resolved'
     AND NEW.workflow_status = COALESCE(OLD.workflow_status, NEW.workflow_status)
     AND NEW.workflow_status = 'completed' THEN
    NEW.workflow_status := 'pending_escalated';
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

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
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
  existing_alert text;
  existing_completed_at timestamptz;
  existing_resolution text;
  existing_date_resolved timestamptz;
  existing_escalation_status text;
  new_id uuid;
BEGIN
  IF _project_name IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    -- 1) Match an active (non-completed) case with same alert_type → repeat alert
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
        SET entered_queue_at = now(),
            last_alert_activity_at = now(),
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

    -- 2) Match a completed case → return it to the New queue, PRESERVING history
    SELECT id, alert_type, completed_at, resolution_type, date_resolved, escalation_status
      INTO existing_id, existing_alert, existing_completed_at,
           existing_resolution, existing_date_resolved, existing_escalation_status
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
      -- Escalation type (resolution_type), escalation status/owner/actor/timestamps
      -- and the previous resolution date are intentionally NOT cleared: they are
      -- the historical evidence that the record was previously escalated.
      UPDATE public.qa_cases
        SET workflow_status = 'new',
            entered_queue_at = now(),
            last_alert_activity_at = now(),
            alert_type = _alert_type,
            appointment_status = COALESCE(_appointment_status, appointment_status),
            appointment_date = COALESCE(_appointment_date, appointment_date),
            patient_name = COALESCE(_patient_name, patient_name),
            service_line = COALESCE(_service_line, service_line),
            review_started_at = NULL,
            completed_at = NULL,
            completed_by_user_id = NULL,
            updated_at = now()
        WHERE id = existing_id;

      INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
      VALUES (existing_id, 'realerted',
              format('New %s alert — case returned to New queue', _alert_type),
              jsonb_build_object(
                'alert_type', _alert_type,
                'alert_source_id', _alert_source_id,
                'previous_completed_at', existing_completed_at,
                'previous_alert_type', existing_alert,
                'previous_resolution_type', existing_resolution,
                'previous_date_resolved', existing_date_resolved,
                'previous_escalation_status', existing_escalation_status
              ));

      IF existing_resolution IS NOT NULL OR existing_escalation_status IS NOT NULL THEN
        INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
        VALUES (existing_id, 'cycle_snapshot',
                format('Previous cycle: %s%s',
                       COALESCE(existing_resolution, 'Audit'),
                       CASE WHEN existing_date_resolved IS NOT NULL
                            THEN ', resolved on ' || to_char(existing_date_resolved, 'Mon DD, YYYY')
                            ELSE '' END),
                jsonb_build_object(
                  'resolution_type', existing_resolution,
                  'escalation_status', existing_escalation_status,
                  'date_resolved', existing_date_resolved,
                  'completed_at', existing_completed_at
                ));
      END IF;

      RETURN existing_id;
    END IF;

    -- 3) No match → brand new case
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
$$;