
-- 1) Review Queue ingest: only open a review_queue case when an open
-- short_notice sibling exists for the same appointment. Transition/resolution
-- logic (approve → confirmed_audit, oon → oon, declined/dismissed → completed)
-- is preserved so any already-open pair still resolves correctly.
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
  has_open_sn boolean;
BEGIN
  new_rs := LOWER(TRIM(COALESCE(NEW.review_status, '')));
  old_rs := CASE WHEN TG_OP = 'UPDATE' THEN LOWER(TRIM(COALESCE(OLD.review_status, ''))) ELSE '' END;

  IF new_rs = old_rs THEN
    RETURN NEW;
  END IF;

  appt_ts := NEW.date_of_appointment;

  BEGIN
    -- A) Entered pending → only open review_queue case if a short_notice case
    -- for this appointment is already open. Otherwise no-op.
    IF new_rs = 'pending' AND (TG_OP = 'INSERT' OR old_rs <> 'pending') THEN
      SELECT EXISTS (
        SELECT 1 FROM public.qa_cases
        WHERE appointment_id = NEW.id
          AND alert_type = 'short_notice'
          AND workflow_status <> 'completed'
      ) INTO has_open_sn;

      IF NOT has_open_sn THEN
        RETURN NEW;
      END IF;

      case_id := public.qa_upsert_case(
        NEW.id, NEW.ghl_id, NEW.project_name, NEW.lead_name, NEW.calendar_name,
        appt_ts, NEW.status, 'review_queue', NULL,
        'Entered Review Queue (paired with Short-Notice alert)'
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

-- 2) Short Notice ingest: open a paired review_queue case if the appointment
-- is currently pending review. Preserves existing short_notice case creation.
CREATE OR REPLACE FUNCTION public.qa_ingest_short_notice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  appt RECORD;
  rq_case_id uuid;
  appt_ts timestamptz;
BEGIN
  SELECT a.id, a.ghl_id, a.project_name, a.lead_name, a.procedure_type,
         a.calendar_name, a.date_of_appointment, a.requested_time, a.status,
         a.review_status
    INTO appt
    FROM public.all_appointments a
   WHERE a.id = NEW.appointment_id
   LIMIT 1;

  IF appt.id IS NULL THEN
    RETURN NEW;
  END IF;

  appt_ts := public.qa_build_appt_ts(appt.project_name, appt.date_of_appointment, appt.requested_time);

  PERFORM public.qa_upsert_case(
    appt.id,
    appt.ghl_id,
    appt.project_name,
    appt.lead_name,
    COALESCE(appt.procedure_type, appt.calendar_name),
    appt_ts,
    appt.status,
    'short_notice',
    NEW.id,
    'Short-notice booking alert'
  );

  -- If appointment is currently pending review, also open a paired
  -- review_queue case so Setter/QA can coordinate.
  IF LOWER(TRIM(COALESCE(appt.review_status, ''))) = 'pending' THEN
    rq_case_id := public.qa_upsert_case(
      appt.id, appt.ghl_id, appt.project_name, appt.lead_name,
      COALESCE(appt.procedure_type, appt.calendar_name),
      appt_ts, appt.status, 'review_queue', NULL,
      'Entered Review Queue (paired with Short-Notice alert)'
    );
    IF rq_case_id IS NOT NULL THEN
      UPDATE public.qa_cases
        SET review_entered_at = COALESCE(review_entered_at, now()),
            review_resolved_at = NULL
        WHERE id = rq_case_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) One-time cleanup: close every open review_queue case that no longer has
-- an open short_notice sibling for the same appointment.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT qc.id AS case_id, qc.appointment_id
    FROM public.qa_cases qc
    WHERE qc.alert_type = 'review_queue'
      AND qc.workflow_status <> 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM public.qa_cases sn
        WHERE sn.appointment_id = qc.appointment_id
          AND sn.alert_type = 'short_notice'
          AND sn.workflow_status <> 'completed'
      )
  LOOP
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
            'Auto-closed — Review Queue alerts now require a paired Short-Notice alert',
            jsonb_build_object('reconciliation', true, 'reason', 'no_open_short_notice_sibling'));
  END LOOP;
END $$;
