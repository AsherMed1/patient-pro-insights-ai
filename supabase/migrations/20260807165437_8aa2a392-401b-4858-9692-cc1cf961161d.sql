ALTER TABLE public.qa_cases ADD COLUMN IF NOT EXISTS short_notice_cleared_at timestamptz;

CREATE OR REPLACE FUNCTION public.qa_resolve_short_notice_on_reschedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
         SET short_notice_cleared_at = COALESCE(short_notice_cleared_at, now()),
             last_alert_activity_at = now(),
             updated_at = now()
       WHERE id = case_id;

      INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
      VALUES (case_id, 'status_change',
              format('Short-Notice condition cleared — appointment rescheduled to %s (%s hours notice, clinic threshold %s hours). Record remains open for audit.',
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