
-- 1. Replace qa_ingest_review_queue with collision-safe version
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
BEGIN
  new_rs := LOWER(TRIM(COALESCE(NEW.review_status, '')));
  old_rs := CASE WHEN TG_OP = 'UPDATE' THEN LOWER(TRIM(COALESCE(OLD.review_status, ''))) ELSE '' END;

  IF new_rs = old_rs THEN
    RETURN NEW;
  END IF;

  appt_ts := NEW.date_of_appointment;

  BEGIN
    -- A) Entered the Review Queue (pending) → open/refresh a review_queue case
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

    SELECT id INTO case_id
      FROM public.qa_cases
      WHERE appointment_id = NEW.id
        AND alert_type = 'review_queue'
        AND workflow_status <> 'completed'
      ORDER BY entered_queue_at DESC
      LIMIT 1;

    IF case_id IS NULL THEN
      RETURN NEW;
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
                jsonb_build_object('from_alert', 'review_queue', 'duplicate_of', 'confirmed_audit', 'review_status', new_rs));
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
                jsonb_build_object('from_alert', 'review_queue', 'to_alert', 'confirmed_audit', 'review_status', new_rs));
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
                jsonb_build_object('from_alert', 'review_queue', 'duplicate_of', 'oon', 'review_status', new_rs));
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
                jsonb_build_object('from_alert', 'review_queue', 'to_alert', 'oon', 'review_status', new_rs));
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
              jsonb_build_object('review_status', new_rs));
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

-- 2. Reconcile stale review_queue cases
DO $$
DECLARE
  r RECORD;
  sibling_exists boolean;
  target_alert text;
BEGIN
  FOR r IN
    SELECT qc.id AS case_id, qc.appointment_id, aa.review_status, aa.status AS appt_status
    FROM public.qa_cases qc
    JOIN public.all_appointments aa ON aa.id = qc.appointment_id
    WHERE qc.alert_type = 'review_queue'
      AND qc.workflow_status <> 'completed'
      AND LOWER(TRIM(COALESCE(aa.review_status,''))) IN ('approved','oon','declined','dismissed')
  LOOP
    IF r.review_status IN ('declined','dismissed') THEN
      UPDATE public.qa_cases
        SET workflow_status = 'completed',
            completed_at = COALESCE(completed_at, now()),
            resolution_type = COALESCE(resolution_type, 'Resolved by QA'),
            date_resolved = COALESCE(date_resolved, now()),
            review_resolved_at = COALESCE(review_resolved_at, now()),
            last_alert_activity_at = now(),
            updated_at = now()
        WHERE id = r.case_id;

      INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
      VALUES (r.case_id, 'status_change',
              'Reconciled from Review Queue backlog — ' || INITCAP(r.review_status) || ' in Review Queue',
              jsonb_build_object('review_status', r.review_status, 'reconciliation', true));
      CONTINUE;
    END IF;

    target_alert := CASE WHEN r.review_status = 'approved' THEN 'confirmed_audit' ELSE 'oon' END;

    SELECT EXISTS (
      SELECT 1 FROM public.qa_cases
      WHERE appointment_id = r.appointment_id
        AND alert_type = target_alert
        AND workflow_status <> 'completed'
        AND id <> r.case_id
    ) INTO sibling_exists;

    IF sibling_exists THEN
      UPDATE public.qa_cases
        SET workflow_status = 'completed',
            completed_at = COALESCE(completed_at, now()),
            resolution_type = COALESCE(resolution_type, 'Resolved by QA'),
            date_resolved = COALESCE(date_resolved, now()),
            review_resolved_at = COALESCE(review_resolved_at, now()),
            last_alert_activity_at = now(),
            updated_at = now()
        WHERE id = r.case_id;

      INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
      VALUES (r.case_id, 'status_change',
              'Reconciled from Review Queue backlog — ' || target_alert || ' sibling already exists',
              jsonb_build_object('review_status', r.review_status, 'duplicate_of', target_alert, 'reconciliation', true));
    ELSE
      UPDATE public.qa_cases
        SET alert_type = target_alert,
            review_resolved_at = COALESCE(review_resolved_at, now()),
            appointment_status = COALESCE(r.appt_status, appointment_status),
            last_alert_activity_at = now(),
            updated_at = now()
        WHERE id = r.case_id;

      INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
      VALUES (r.case_id, 'status_change',
              'Reconciled from Review Queue backlog — switched to ' || target_alert,
              jsonb_build_object('review_status', r.review_status, 'to_alert', target_alert, 'reconciliation', true));
    END IF;
  END LOOP;
END $$;
