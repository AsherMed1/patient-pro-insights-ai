
-- Helper: build a UTC timestamptz from a project's local wall-clock date+time
CREATE OR REPLACE FUNCTION public.qa_build_appt_ts(
  _project_name text,
  _date date,
  _time time
) RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proj_tz text;
BEGIN
  IF _date IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT COALESCE(NULLIF(TRIM(timezone), ''), 'America/Chicago')
    INTO proj_tz
    FROM public.projects
   WHERE project_name = _project_name
   LIMIT 1;
  proj_tz := COALESCE(proj_tz, 'America/Chicago');
  RETURN ((_date::text || ' ' || COALESCE(_time, '00:00:00'::time)::text)::timestamp)
         AT TIME ZONE proj_tz;
END;
$$;

-- Rewrite qa_ingest_confirmed_audit
CREATE OR REPLACE FUNCTION public.qa_ingest_confirmed_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

    appt_ts := public.qa_build_appt_ts(NEW.project_name, NEW.date_of_appointment, NEW.requested_time);

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

-- Rewrite qa_ingest_short_notice
CREATE OR REPLACE FUNCTION public.qa_ingest_short_notice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  appt RECORD;
BEGIN
  SELECT a.id, a.ghl_id, a.project_name, a.lead_name, a.procedure_type,
         a.calendar_name, a.date_of_appointment, a.requested_time, a.status
    INTO appt
    FROM public.all_appointments a
   WHERE a.id = NEW.appointment_id
   LIMIT 1;

  IF appt.id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.qa_upsert_case(
    appt.id,
    appt.ghl_id,
    appt.project_name,
    appt.lead_name,
    COALESCE(appt.procedure_type, appt.calendar_name),
    public.qa_build_appt_ts(appt.project_name, appt.date_of_appointment, appt.requested_time),
    appt.status,
    'short_notice',
    NEW.id,
    'Short-notice booking alert'
  );

  RETURN NEW;
END;
$function$;

-- Rewrite qa_ingest_terminal_status (OON branch stores appt_ts too)
CREATE OR REPLACE FUNCTION public.qa_ingest_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_status text;
  old_status text;
  appt_ts timestamptz;
  metric_kind text;
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
    ELSIF new_status IN ('cancelled','canceled') AND COALESCE(OLD.was_ever_confirmed, false) = true THEN
      metric_kind := 'cancelled';
    ELSIF new_status IN ('no show','noshow','no-show') AND COALESCE(OLD.was_ever_confirmed, false) = true THEN
      metric_kind := 'no_show';
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

-- Patch qa_ingest_review_queue's appt_ts assignment to use the helper
-- (only the INSERT branch uses appt_ts; keep the rest of the function intact by
-- replacing appt_ts source). We wrap the whole function to be safe.
CREATE OR REPLACE FUNCTION public.qa_ingest_review_queue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  old_rs text;
  new_rs text;
  reviewer_name text;
  case_id uuid;
  appt_ts timestamptz;
  sibling_exists boolean;
  entered_at timestamptz;
  duration_min numeric;
BEGIN
  new_rs := LOWER(TRIM(COALESCE(NEW.review_status, '')));
  old_rs := CASE WHEN TG_OP = 'UPDATE' THEN LOWER(TRIM(COALESCE(OLD.review_status, ''))) ELSE '' END;

  IF new_rs = old_rs THEN
    RETURN NEW;
  END IF;

  appt_ts := public.qa_build_appt_ts(NEW.project_name, NEW.date_of_appointment, NEW.requested_time);

  BEGIN
    IF new_rs = 'pending' AND (TG_OP = 'INSERT' OR old_rs <> 'pending') THEN
      case_id := public.qa_upsert_case(
        NEW.id, NEW.ghl_id, NEW.project_name, NEW.lead_name, NEW.calendar_name,
        appt_ts, NEW.status, 'review_queue', NULL,
        'Entered Review Queue'
      );
      IF case_id IS NOT NULL THEN
        UPDATE public.qa_cases
          SET review_entered_at = COALESCE(review_entered_at, now()),
              review_resolved_at = NULL
          WHERE id = case_id;
      END IF;
      RETURN NEW;
    END IF;

    IF old_rs <> 'pending' THEN
      RETURN NEW;
    END IF;

    reviewer_name := NULL;
    IF NEW.reviewed_by IS NOT NULL THEN
      SELECT COALESCE(NULLIF(TRIM(full_name), ''), email)
        INTO reviewer_name
        FROM public.profiles
        WHERE id = NEW.reviewed_by;
    END IF;

    SELECT id, review_entered_at INTO case_id, entered_at
      FROM public.qa_cases
      WHERE appointment_id = NEW.id
        AND alert_type = 'review_queue'
        AND workflow_status <> 'completed'
      ORDER BY entered_queue_at DESC
      LIMIT 1;

    IF case_id IS NULL THEN
      RETURN NEW;
    END IF;

    IF entered_at IS NOT NULL THEN
      duration_min := EXTRACT(EPOCH FROM (now() - entered_at)) / 60.0;
    END IF;

    IF new_rs = 'approved' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.qa_cases
        WHERE appointment_id = NEW.id
          AND alert_type = 'confirmed_audit'
          AND workflow_status <> 'completed'
          AND id <> case_id
      ) INTO sibling_exists;

      IF sibling_exists THEN
        UPDATE public.qa_cases
          SET workflow_status = 'completed',
              completed_at = COALESCE(completed_at, now()),
              completed_by_user_id = COALESCE(completed_by_user_id, NEW.reviewed_by),
              resolution_type = COALESCE(resolution_type, 'Resolved by QA'),
              date_resolved = COALESCE(date_resolved, now()),
              review_resolved_at = COALESCE(review_resolved_at, now()),
              review_queue_duration = COALESCE(review_queue_duration, duration_min)
          WHERE id = case_id;
      ELSE
        UPDATE public.qa_cases
          SET alert_type = 'confirmed_audit',
              workflow_status = 'new',
              appointment_date = appt_ts,
              appointment_status = NEW.status,
              review_resolved_at = COALESCE(review_resolved_at, now()),
              review_queue_duration = COALESCE(review_queue_duration, duration_min),
              last_alert_activity_at = now()
          WHERE id = case_id;
      END IF;

      INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
      VALUES (case_id, 'review_approved',
        format('Approved in Review Queue%s',
          CASE WHEN reviewer_name IS NOT NULL THEN ' by ' || reviewer_name ELSE '' END),
        jsonb_build_object(
          'reviewer_id', NEW.reviewed_by,
          'reviewer_name', reviewer_name,
          'duration_minutes', duration_min
        ));
    ELSIF new_rs = 'oon' THEN
      UPDATE public.qa_cases
        SET alert_type = 'oon',
            workflow_status = 'new',
            appointment_date = appt_ts,
            appointment_status = NEW.status,
            review_resolved_at = COALESCE(review_resolved_at, now()),
            review_queue_duration = COALESCE(review_queue_duration, duration_min),
            last_alert_activity_at = now()
        WHERE id = case_id;

      INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
      VALUES (case_id, 'review_oon',
        format('Marked OON in Review Queue%s',
          CASE WHEN reviewer_name IS NOT NULL THEN ' by ' || reviewer_name ELSE '' END),
        jsonb_build_object(
          'reviewer_id', NEW.reviewed_by,
          'reviewer_name', reviewer_name,
          'duration_minutes', duration_min
        ));
    ELSIF new_rs IN ('declined','dismissed') THEN
      UPDATE public.qa_cases
        SET workflow_status = 'completed',
            completed_at = COALESCE(completed_at, now()),
            completed_by_user_id = COALESCE(completed_by_user_id, NEW.reviewed_by),
            resolution_type = COALESCE(resolution_type, 'Declined in Review Queue'),
            date_resolved = COALESCE(date_resolved, now()),
            review_resolved_at = COALESCE(review_resolved_at, now()),
            review_queue_duration = COALESCE(review_queue_duration, duration_min)
        WHERE id = case_id;

      INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
      VALUES (case_id, 'review_' || new_rs,
        format('%s in Review Queue%s', INITCAP(new_rs),
          CASE WHEN reviewer_name IS NOT NULL THEN ' by ' || reviewer_name ELSE '' END),
        jsonb_build_object(
          'reviewer_id', NEW.reviewed_by,
          'reviewer_name', reviewer_name,
          'duration_minutes', duration_min
        ));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.security_audit_log (event_type, details)
      VALUES ('qa_ingest_review_queue_failed', jsonb_build_object(
        'appointment_id', NEW.id, 'sqlstate', SQLSTATE, 'sqlerrm', SQLERRM
      ));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;
  RETURN NEW;
END;
$function$;

-- Backfill: recompute appointment_date for all non-completed qa_cases whose stored
-- value doesn't match the project-timezone conversion.
UPDATE public.qa_cases q
   SET appointment_date = public.qa_build_appt_ts(a.project_name, a.date_of_appointment, a.requested_time)
  FROM public.all_appointments a
 WHERE q.appointment_id = a.id
   AND a.date_of_appointment IS NOT NULL
   AND (
     q.appointment_date IS DISTINCT FROM public.qa_build_appt_ts(a.project_name, a.date_of_appointment, a.requested_time)
   );
