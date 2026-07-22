
-- Enrich qa_ingest_review_queue: add structured metadata + duration activity row
CREATE OR REPLACE FUNCTION public.qa_ingest_review_queue()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

  appt_ts := NEW.date_of_appointment;

  BEGIN
    -- Entered the Review Queue
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
              last_alert_activity_at = now(),
              updated_at = now()
          WHERE id = case_id;

        INSERT INTO public.qa_case_activity (case_id, activity_type, description, actor_user_id, metadata)
        VALUES (case_id, 'status_change',
                format('Approved by %s — closed as duplicate (Confirmed Audit case already exists)',
                       COALESCE(reviewer_name, 'reviewer')),
                NEW.reviewed_by,
                jsonb_build_object('from_alert','review_queue','duplicate_of','confirmed_audit',
                                   'review_status',new_rs,'actor_name',reviewer_name));
      ELSE
        UPDATE public.qa_cases
          SET alert_type = 'confirmed_audit',
              review_resolved_at = now(),
              appointment_status = COALESCE(NEW.status, appointment_status),
              last_alert_activity_at = now(),
              updated_at = now()
          WHERE id = case_id;

        INSERT INTO public.qa_case_activity (case_id, activity_type, description, actor_user_id, metadata)
        VALUES (case_id, 'status_change',
                format('Approved by %s — alert switched from Review Queue to Confirmed Audit',
                       COALESCE(reviewer_name, 'reviewer')),
                NEW.reviewed_by,
                jsonb_build_object('from_alert','review_queue','to_alert','confirmed_audit',
                                   'review_status',new_rs,'actor_name',reviewer_name));
      END IF;

    ELSIF new_rs = 'oon' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.qa_cases
        WHERE appointment_id = NEW.id
          AND alert_type = 'oon'
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
              last_alert_activity_at = now(),
              updated_at = now()
          WHERE id = case_id;

        INSERT INTO public.qa_case_activity (case_id, activity_type, description, actor_user_id, metadata)
        VALUES (case_id, 'status_change',
                format('Marked OON by %s — closed as duplicate (OON case already exists)',
                       COALESCE(reviewer_name, 'reviewer')),
                NEW.reviewed_by,
                jsonb_build_object('from_alert','review_queue','duplicate_of','oon',
                                   'review_status',new_rs,'actor_name',reviewer_name));
      ELSE
        UPDATE public.qa_cases
          SET alert_type = 'oon',
              review_resolved_at = now(),
              appointment_status = COALESCE(NEW.status, appointment_status),
              last_alert_activity_at = now(),
              updated_at = now()
          WHERE id = case_id;

        INSERT INTO public.qa_case_activity (case_id, activity_type, description, actor_user_id, metadata)
        VALUES (case_id, 'status_change',
                format('Marked OON by %s — alert switched from Review Queue to OON',
                       COALESCE(reviewer_name, 'reviewer')),
                NEW.reviewed_by,
                jsonb_build_object('from_alert','review_queue','to_alert','oon',
                                   'review_status',new_rs,'actor_name',reviewer_name));
      END IF;

    ELSIF new_rs IN ('declined', 'dismissed') THEN
      UPDATE public.qa_cases
        SET workflow_status = 'completed',
            completed_at = COALESCE(completed_at, now()),
            completed_by_user_id = COALESCE(completed_by_user_id, NEW.reviewed_by),
            resolution_type = COALESCE(resolution_type, 'Resolved by QA'),
            date_resolved = COALESCE(date_resolved, now()),
            review_resolved_at = COALESCE(review_resolved_at, now()),
            last_alert_activity_at = now(),
            updated_at = now()
        WHERE id = case_id;

      INSERT INTO public.qa_case_activity (case_id, activity_type, description, actor_user_id, metadata)
      VALUES (case_id, 'status_change',
              format('%s in Review Queue by %s',
                     INITCAP(new_rs),
                     COALESCE(reviewer_name, 'reviewer')),
              NEW.reviewed_by,
              jsonb_build_object('from_alert','review_queue','resolution',new_rs,
                                 'review_status',new_rs,'actor_name',reviewer_name));
    END IF;

    -- Duration in Review Queue (one row per resolution)
    IF new_rs IN ('approved','oon','declined','dismissed') AND duration_min IS NOT NULL THEN
      INSERT INTO public.qa_case_activity (case_id, activity_type, description, actor_user_id, metadata)
      VALUES (case_id, 'review_queue_duration',
              format('Spent %s in Review Queue',
                     CASE
                       WHEN duration_min < 60 THEN ROUND(duration_min)::text || 'm'
                       WHEN duration_min < 1440 THEN FLOOR(duration_min/60)::text || 'h ' || ROUND(duration_min - FLOOR(duration_min/60)*60)::text || 'm'
                       ELSE FLOOR(duration_min/1440)::text || 'd ' || FLOOR((duration_min - FLOOR(duration_min/1440)*1440)/60)::text || 'h'
                     END),
              NEW.reviewed_by,
              jsonb_build_object('duration_minutes', duration_min,
                                 'review_entered_at', entered_at,
                                 'review_resolved_at', now()));
    END IF;

    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.security_audit_log (event_type, details)
      VALUES ('qa_ingest_review_queue_failed', jsonb_build_object(
        'appointment_id', NEW.id,
        'new_review_status', new_rs,
        'old_review_status', old_rs,
        'sqlstate', SQLSTATE,
        'sqlerrm', SQLERRM
      ));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN NEW;
  END;
END;
$function$;

-- Backfill review_queue_duration for completed cases lacking it
INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata, created_at)
SELECT
  qc.id,
  'review_queue_duration',
  format('Spent %s in Review Queue',
    CASE
      WHEN EXTRACT(EPOCH FROM (qc.review_resolved_at - qc.review_entered_at))/60.0 < 60
        THEN ROUND(EXTRACT(EPOCH FROM (qc.review_resolved_at - qc.review_entered_at))/60.0)::text || 'm'
      WHEN EXTRACT(EPOCH FROM (qc.review_resolved_at - qc.review_entered_at))/60.0 < 1440
        THEN FLOOR(EXTRACT(EPOCH FROM (qc.review_resolved_at - qc.review_entered_at))/3600.0)::text || 'h ' ||
             ROUND(EXTRACT(EPOCH FROM (qc.review_resolved_at - qc.review_entered_at))/60.0
                   - FLOOR(EXTRACT(EPOCH FROM (qc.review_resolved_at - qc.review_entered_at))/3600.0)*60)::text || 'm'
      ELSE FLOOR(EXTRACT(EPOCH FROM (qc.review_resolved_at - qc.review_entered_at))/86400.0)::text || 'd ' ||
           FLOOR((EXTRACT(EPOCH FROM (qc.review_resolved_at - qc.review_entered_at))/3600.0)
                 - FLOOR(EXTRACT(EPOCH FROM (qc.review_resolved_at - qc.review_entered_at))/86400.0)*24)::text || 'h'
    END),
  jsonb_build_object(
    'duration_minutes', EXTRACT(EPOCH FROM (qc.review_resolved_at - qc.review_entered_at))/60.0,
    'review_entered_at', qc.review_entered_at,
    'review_resolved_at', qc.review_resolved_at,
    'backfilled', true
  ),
  qc.review_resolved_at
FROM public.qa_cases qc
WHERE qc.review_entered_at IS NOT NULL
  AND qc.review_resolved_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.qa_case_activity a
    WHERE a.case_id = qc.id AND a.activity_type = 'review_queue_duration'
  );
