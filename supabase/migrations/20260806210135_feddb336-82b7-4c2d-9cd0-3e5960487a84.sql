ALTER TABLE public.short_notice_alerts
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_reason text,
  ADD COLUMN IF NOT EXISTS resolved_hours_difference numeric;

CREATE OR REPLACE FUNCTION public.qa_resolve_short_notice_on_reschedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_ts timestamptz;
  threshold numeric;
  hours_out numeric;
  open_alert_count integer;
  case_id uuid;
BEGIN
  IF NEW.date_of_appointment IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.date_of_appointment IS NOT DISTINCT FROM OLD.date_of_appointment
     AND NEW.requested_time IS NOT DISTINCT FROM OLD.requested_time THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO open_alert_count
    FROM public.short_notice_alerts
   WHERE appointment_id = NEW.id
     AND resolved_at IS NULL;

  IF open_alert_count = 0 THEN
    RETURN NEW;
  END IF;

  new_ts := public.qa_build_appt_ts(NEW.project_name, NEW.date_of_appointment, NEW.requested_time);
  IF new_ts IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(short_notice_threshold_hours, 72) INTO threshold
    FROM public.projects
   WHERE project_name = NEW.project_name
   LIMIT 1;
  threshold := COALESCE(threshold, 72);

  hours_out := EXTRACT(EPOCH FROM (new_ts - now())) / 3600.0;

  SELECT id INTO case_id
    FROM public.qa_cases
   WHERE appointment_id = NEW.id
     AND alert_type = 'short_notice'
     AND workflow_status <> 'completed'
   ORDER BY entered_queue_at DESC
   LIMIT 1;

  IF hours_out >= threshold THEN
    UPDATE public.short_notice_alerts
       SET resolved_at = now(),
           resolved_reason = 'rescheduled_outside_window',
           resolved_hours_difference = ROUND(hours_out, 2),
           appointment_datetime = new_ts
     WHERE appointment_id = NEW.id
       AND resolved_at IS NULL;

    IF case_id IS NOT NULL THEN
      UPDATE public.qa_cases
         SET workflow_status = 'completed',
             completed_at = COALESCE(completed_at, now()),
             resolution_type = COALESCE(resolution_type, 'Resolved by QA'),
             date_resolved = COALESCE(date_resolved, now()),
             last_alert_activity_at = now(),
             updated_at = now()
       WHERE id = case_id;

      INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
      VALUES (case_id, 'status_change',
              format('Short-Notice alert auto-resolved — appointment rescheduled to %s (%s hours notice, clinic threshold %s hours)',
                     to_char(new_ts, 'Mon DD, YYYY HH12:MI AM'), ROUND(hours_out, 1), threshold),
              jsonb_build_object('reason', 'rescheduled_outside_window',
                                 'hours_notice', ROUND(hours_out, 2),
                                 'threshold_hours', threshold));
    END IF;
  ELSE
    UPDATE public.short_notice_alerts
       SET hours_difference = ROUND(hours_out, 2),
           appointment_datetime = new_ts
     WHERE appointment_id = NEW.id
       AND resolved_at IS NULL;

    IF case_id IS NOT NULL THEN
      INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
      VALUES (case_id, 'status_change',
              format('Appointment rescheduled to %s — still short notice (%s hours notice, clinic threshold %s hours)',
                     to_char(new_ts, 'Mon DD, YYYY HH12:MI AM'), ROUND(hours_out, 1), threshold),
              jsonb_build_object('reason', 'rescheduled_still_short_notice',
                                 'hours_notice', ROUND(hours_out, 2),
                                 'threshold_hours', threshold));
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    INSERT INTO public.security_audit_log (event_type, details)
    VALUES ('qa_resolve_short_notice_on_reschedule_failed', jsonb_build_object(
      'appointment_id', NEW.id,
      'sqlstate', SQLSTATE,
      'sqlerrm', SQLERRM
    ));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_qa_resolve_short_notice_on_reschedule ON public.all_appointments;
CREATE TRIGGER trg_qa_resolve_short_notice_on_reschedule
AFTER UPDATE OF date_of_appointment, requested_time ON public.all_appointments
FOR EACH ROW EXECUTE FUNCTION public.qa_resolve_short_notice_on_reschedule();

-- One-time cleanup of stale short-notice alerts
WITH candidates AS (
  SELECT sna.id AS alert_id,
         a.id AS appointment_id,
         public.qa_build_appt_ts(a.project_name, a.date_of_appointment, a.requested_time) AS new_ts,
         COALESCE(p.short_notice_threshold_hours, 72)::numeric AS threshold
    FROM public.short_notice_alerts sna
    JOIN public.all_appointments a ON a.id = sna.appointment_id
    LEFT JOIN public.projects p ON p.project_name = a.project_name
   WHERE sna.resolved_at IS NULL
     AND a.date_of_appointment IS NOT NULL
), resolvable AS (
  SELECT *, EXTRACT(EPOCH FROM (new_ts - now())) / 3600.0 AS hours_out
    FROM candidates
   WHERE new_ts IS NOT NULL
), to_resolve AS (
  SELECT * FROM resolvable WHERE hours_out >= threshold
), upd_alerts AS (
  UPDATE public.short_notice_alerts sna
     SET resolved_at = now(),
         resolved_reason = 'backfill_outside_window',
         resolved_hours_difference = ROUND(tr.hours_out, 2)
    FROM to_resolve tr
   WHERE sna.id = tr.alert_id
  RETURNING sna.appointment_id
)
UPDATE public.qa_cases q
   SET workflow_status = 'completed',
       completed_at = COALESCE(q.completed_at, now()),
       resolution_type = COALESCE(q.resolution_type, 'Resolved by QA'),
       date_resolved = COALESCE(q.date_resolved, now()),
       last_alert_activity_at = now(),
       updated_at = now()
  FROM upd_alerts ua
 WHERE q.appointment_id = ua.appointment_id
   AND q.alert_type = 'short_notice'
   AND q.workflow_status <> 'completed';