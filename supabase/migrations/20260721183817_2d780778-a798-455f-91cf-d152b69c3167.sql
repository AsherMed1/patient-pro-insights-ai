
-- Add first_entered_at to preserve original queue-entry time
ALTER TABLE public.qa_cases
  ADD COLUMN IF NOT EXISTS first_entered_at timestamptz NOT NULL DEFAULT now();

-- Backfill from earliest known event
UPDATE public.qa_cases c
SET first_entered_at = LEAST(
  COALESCE(c.created_at, c.entered_queue_at, now()),
  COALESCE(c.entered_queue_at, c.created_at, now()),
  COALESCE((SELECT MIN(a.created_at) FROM public.qa_case_activity a WHERE a.case_id = c.id), c.created_at, c.entered_queue_at, now())
);

-- Update qa_upsert_case so repeat alerts on active cases also bump entered_queue_at
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
  existing_alert text;
  existing_completed_at timestamptz;
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

    -- 2) Match a completed case → return it to the New queue at top, keep history
    SELECT id, alert_type, completed_at
      INTO existing_id, existing_alert, existing_completed_at
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
            date_resolved = NULL,
            resolution_type = NULL,
            updated_at = now()
        WHERE id = existing_id;

      INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
      VALUES (existing_id, 'realerted',
              format('New %s alert — case returned to New queue', _alert_type),
              jsonb_build_object(
                'alert_type', _alert_type,
                'alert_source_id', _alert_source_id,
                'previous_completed_at', existing_completed_at,
                'previous_alert_type', existing_alert
              ));

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
$function$;
