ALTER TABLE public.recapture_cases
  ADD COLUMN IF NOT EXISTS lead_phone_number text,
  ADD COLUMN IF NOT EXISTS lead_email text;

CREATE OR REPLACE FUNCTION public.recapture_upsert_case(
  _appointment_id uuid,
  _ghl_contact_id text,
  _project_name text,
  _patient_name text,
  _lead_phone_number text,
  _lead_email text,
  _service_line text,
  _lost_type text,
  _lost_status_at_entry text,
  _appointment_date timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
  new_id uuid;
BEGIN
  IF _project_name IS NULL OR _lost_type IS NULL THEN
    RETURN NULL;
  END IF;

  IF _ghl_contact_id IS NOT NULL AND public.is_reschedule_blocked(_ghl_contact_id, _project_name, NULL) THEN
    RETURN NULL;
  END IF;

  SELECT id INTO existing_id
  FROM public.recapture_cases
  WHERE appointment_id = _appointment_id
    AND work_status <> 'completed'
  ORDER BY entered_worklist_at DESC
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.recapture_cases
    SET lost_status_at_entry = COALESCE(_lost_status_at_entry, lost_status_at_entry),
        appointment_date = COALESCE(_appointment_date, appointment_date),
        patient_name = COALESCE(_patient_name, patient_name),
        lead_phone_number = COALESCE(_lead_phone_number, lead_phone_number),
        lead_email = COALESCE(_lead_email, lead_email),
        service_line = COALESCE(_service_line, service_line),
        stale = false,
        updated_at = now()
    WHERE id = existing_id;
    RETURN existing_id;
  END IF;

  INSERT INTO public.recapture_cases (
    appointment_id, ghl_contact_id, project_name, patient_name, lead_phone_number, lead_email, service_line,
    lost_type, lost_status_at_entry, appointment_date
  ) VALUES (
    _appointment_id, _ghl_contact_id, _project_name, _patient_name, _lead_phone_number, _lead_email, _service_line,
    _lost_type, _lost_status_at_entry, _appointment_date
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.qa_ingest_terminal_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_status text;
  old_status text;
  alert_type text;
  lost_type text;
  appt_ts timestamptz;
BEGIN
  new_status := LOWER(TRIM(COALESCE(NEW.status, '')));
  old_status := LOWER(TRIM(COALESCE(OLD.status, '')));
  IF new_status = old_status THEN
    RETURN NEW;
  END IF;

  IF new_status = 'oon' THEN
    alert_type := 'oon';
  ELSIF new_status IN ('cancelled','canceled') AND COALESCE(OLD.was_ever_confirmed, false) = true THEN
    alert_type := 'cancelled';
  ELSIF new_status IN ('no show','noshow','no-show') AND COALESCE(OLD.was_ever_confirmed, false) = true THEN
    alert_type := 'no_show';
  ELSE
    RETURN NEW;
  END IF;

  appt_ts := CASE WHEN NEW.date_of_appointment IS NOT NULL
                  THEN (NEW.date_of_appointment::text || ' ' || COALESCE(NEW.requested_time, '00:00:00'))::timestamptz
                  ELSE NULL END;

  PERFORM public.qa_upsert_case(
    NEW.id,
    NEW.ghl_id,
    NEW.project_name,
    NEW.lead_name,
    NEW.calendar_name,
    appt_ts,
    NEW.status,
    alert_type,
    NULL,
    format('Status changed to %s', NEW.status)
  );

  IF alert_type IN ('cancelled', 'no_show') THEN
    lost_type := CASE WHEN alert_type = 'cancelled' THEN 'cancelled' ELSE 'no_show' END;
    PERFORM public.recapture_upsert_case(
      NEW.id,
      NEW.ghl_id,
      NEW.project_name,
      NEW.lead_name,
      NEW.lead_phone_number,
      NEW.lead_email,
      NEW.calendar_name,
      lost_type,
      NEW.status,
      appt_ts
    );
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.recapture_cases rc
SET lead_phone_number = a.lead_phone_number,
    lead_email = a.lead_email
FROM public.all_appointments a
WHERE rc.appointment_id = a.id
  AND (rc.lead_phone_number IS NULL OR rc.lead_email IS NULL);