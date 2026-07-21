
-- 1. Extend alert_type constraint to include review_queue
ALTER TABLE public.qa_cases DROP CONSTRAINT IF EXISTS qa_cases_alert_type_check;
ALTER TABLE public.qa_cases ADD CONSTRAINT qa_cases_alert_type_check
  CHECK (alert_type = ANY (ARRAY['short_notice','oon','cancelled','no_show','confirmed_audit','review_queue']));

-- 2. Add lifecycle timestamps
ALTER TABLE public.qa_cases
  ADD COLUMN IF NOT EXISTS review_entered_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_resolved_at timestamptz;

-- 3. Trigger function: ingest / transition Review Queue cases
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

    -- Anything below is a transition OUT of pending → resolve the review_queue case
    IF old_rs <> 'pending' THEN
      RETURN NEW;
    END IF;

    -- Lookup reviewer's display name
    reviewer_name := NULL;
    IF NEW.reviewed_by IS NOT NULL THEN
      SELECT COALESCE(NULLIF(TRIM(full_name), ''), email)
        INTO reviewer_name
        FROM public.profiles
        WHERE id = NEW.reviewed_by;
    END IF;

    -- Find the open review_queue case for this appointment
    SELECT id INTO case_id
      FROM public.qa_cases
      WHERE appointment_id = NEW.id
        AND alert_type = 'review_queue'
      ORDER BY entered_queue_at DESC
      LIMIT 1;

    IF case_id IS NULL THEN
      RETURN NEW;
    END IF;

    IF new_rs = 'approved' THEN
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

    ELSIF new_rs = 'oon' THEN
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

    ELSIF new_rs IN ('declined', 'dismissed') THEN
      UPDATE public.qa_cases
        SET workflow_status = 'completed',
            completed_at = COALESCE(completed_at, now()),
            completed_by_user_id = COALESCE(completed_by_user_id, NEW.reviewed_by),
            resolution_type = COALESCE(resolution_type, 'Declined in Review Queue'),
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

DROP TRIGGER IF EXISTS trg_qa_ingest_review_queue_ins ON public.all_appointments;
CREATE TRIGGER trg_qa_ingest_review_queue_ins
  AFTER INSERT ON public.all_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.qa_ingest_review_queue();

DROP TRIGGER IF EXISTS trg_qa_ingest_review_queue_upd ON public.all_appointments;
CREATE TRIGGER trg_qa_ingest_review_queue_upd
  AFTER UPDATE OF review_status ON public.all_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.qa_ingest_review_queue();

-- 4. Backfill current pending review-queue appointments
DO $$
DECLARE
  r RECORD;
  new_case uuid;
BEGIN
  FOR r IN
    SELECT a.*
    FROM public.all_appointments a
    WHERE LOWER(TRIM(COALESCE(a.review_status, ''))) = 'pending'
      AND COALESCE(a.is_reserved_block, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM public.qa_cases q
        WHERE q.appointment_id = a.id AND q.alert_type = 'review_queue'
      )
    ORDER BY a.created_at DESC
    LIMIT 2000
  LOOP
    new_case := public.qa_upsert_case(
      r.id, r.ghl_id, r.project_name, r.lead_name, r.calendar_name,
      r.date_of_appointment, r.status, 'review_queue', NULL,
      'Entered Review Queue (backfill)'
    );
    IF new_case IS NOT NULL THEN
      UPDATE public.qa_cases
        SET review_entered_at = COALESCE(review_entered_at, r.created_at, now())
        WHERE id = new_case;
    END IF;
  END LOOP;
END $$;
