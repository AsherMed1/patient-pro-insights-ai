CREATE OR REPLACE FUNCTION public.qa_upsert_case(_appointment_id uuid, _ghl_contact_id text, _project_name text, _patient_name text, _service_line text, _appointment_date timestamp with time zone, _appointment_status text, _alert_type text, _alert_source_id uuid, _activity_description text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing_id uuid;
  existing_alert text;
  existing_completed_at timestamptz;
  existing_resolution text;
  existing_date_resolved timestamptz;
  existing_escalation_status text;
  new_id uuid;
  sib RECORD;
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

    -- 3b) The audit belongs to the appointment, not the alert row: if a sibling
    -- case for the same appointment/contact already carries audit details, copy
    -- them forward so the new row does not open as a blank slate.
    SELECT id, alert_type, qa_name, self_booked, error_category, error_source,
           caught_before_clinic, resolution_type
      INTO sib
    FROM public.qa_cases
    WHERE id <> new_id
      AND (
        (_appointment_id IS NOT NULL AND appointment_id = _appointment_id)
        OR (_appointment_id IS NULL AND _ghl_contact_id IS NOT NULL AND ghl_contact_id = _ghl_contact_id)
      )
      AND (qa_name IS NOT NULL OR error_category IS NOT NULL OR error_source IS NOT NULL
           OR resolution_type IS NOT NULL OR caught_before_clinic IS NOT NULL
           OR self_booked IS NOT NULL)
    ORDER BY updated_at DESC
    LIMIT 1;

    IF sib.id IS NOT NULL THEN
      UPDATE public.qa_cases
        SET qa_name = sib.qa_name,
            self_booked = sib.self_booked,
            error_category = sib.error_category,
            error_source = sib.error_source,
            caught_before_clinic = sib.caught_before_clinic,
            resolution_type = sib.resolution_type,
            updated_at = now()
        WHERE id = new_id;

      INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
      VALUES (new_id, 'audit_inherited',
              format('Audit details carried over from the %s case',
                     replace(COALESCE(sib.alert_type, 'earlier'), '_', ' ')),
              jsonb_build_object(
                'source_case_id', sib.id,
                'source_alert_type', sib.alert_type,
                'qa_name', sib.qa_name,
                'error_category', sib.error_category,
                'error_source', sib.error_source,
                'resolution_type', sib.resolution_type
              ));
    END IF;

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

-- Backfill: blank QA cases that have an audited sibling for the same appointment
WITH blank AS (
  SELECT id, appointment_id
  FROM public.qa_cases
  WHERE appointment_id IS NOT NULL
    AND qa_name IS NULL AND error_category IS NULL AND error_source IS NULL
    AND resolution_type IS NULL AND caught_before_clinic IS NULL AND self_booked IS NULL
), src AS (
  SELECT b.id AS target_id,
         s.id AS source_id, s.alert_type, s.qa_name, s.self_booked, s.error_category,
         s.error_source, s.caught_before_clinic, s.resolution_type
  FROM blank b
  JOIN LATERAL (
    SELECT c.*
    FROM public.qa_cases c
    WHERE c.appointment_id = b.appointment_id
      AND c.id <> b.id
      AND (c.qa_name IS NOT NULL OR c.error_category IS NOT NULL OR c.error_source IS NOT NULL
           OR c.resolution_type IS NOT NULL OR c.caught_before_clinic IS NOT NULL
           OR c.self_booked IS NOT NULL)
    ORDER BY c.updated_at DESC
    LIMIT 1
  ) s ON true
), upd AS (
  UPDATE public.qa_cases t
     SET qa_name = src.qa_name,
         self_booked = src.self_booked,
         error_category = src.error_category,
         error_source = src.error_source,
         caught_before_clinic = src.caught_before_clinic,
         resolution_type = src.resolution_type,
         updated_at = now()
    FROM src
   WHERE t.id = src.target_id
  RETURNING t.id, src.source_id, src.alert_type, src.qa_name, src.error_category,
            src.error_source, src.resolution_type
)
INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
SELECT id, 'audit_inherited',
       format('Audit details carried over from the %s case', replace(COALESCE(alert_type, 'earlier'), '_', ' ')),
       jsonb_build_object(
         'source_case_id', source_id,
         'source_alert_type', alert_type,
         'qa_name', qa_name,
         'error_category', error_category,
         'error_source', error_source,
         'resolution_type', resolution_type,
         'backfill', true
       )
FROM upd;