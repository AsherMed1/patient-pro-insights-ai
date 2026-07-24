CREATE OR REPLACE FUNCTION public.qa_ingest_short_notice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  appt RECORD;
  rq_case_id uuid;
  appt_ts timestamptz;
BEGIN
  SELECT a.id, a.ghl_id, a.project_name, a.lead_name,
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
    appt.calendar_name,
    appt_ts,
    appt.status,
    'short_notice',
    NEW.id,
    'Short-notice booking alert'
  );

  IF LOWER(TRIM(COALESCE(appt.review_status, ''))) = 'pending' THEN
    rq_case_id := public.qa_upsert_case(
      appt.id, appt.ghl_id, appt.project_name, appt.lead_name,
      appt.calendar_name,
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