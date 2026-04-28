-- 1. Columns
ALTER TABLE public.all_appointments
  ADD COLUMN IF NOT EXISTS recaptured_from_appointment_id uuid REFERENCES public.all_appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recapture_detected_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_all_appointments_recaptured_from
  ON public.all_appointments(recaptured_from_appointment_id)
  WHERE recaptured_from_appointment_id IS NOT NULL;

-- 2. Trigger function: link new active appt to most recent lost appt (same patient, same project, within 90 days)
CREATE OR REPLACE FUNCTION public.link_recapture_on_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lost_statuses text[] := ARRAY['cancelled','canceled','no show','noshow','no-show','do not call','donotcall'];
  active_statuses text[] := ARRAY['confirmed','pending','welcome call','rescheduled'];
  is_active boolean;
  matched_id uuid;
BEGIN
  -- Skip reserved blocks and superseded
  IF COALESCE(NEW.is_reserved_block, false) = true OR COALESCE(NEW.is_superseded, false) = true THEN
    RETURN NEW;
  END IF;

  -- Determine if NEW is in an active (non-lost, non-final-positive) state
  -- Active = not in lost list. Even Showed/Won count as recaptures (patient came back and showed up).
  is_active := NEW.status IS NULL
    OR LOWER(TRIM(NEW.status)) <> ALL(lost_statuses);

  IF NOT is_active THEN
    RETURN NEW;
  END IF;

  -- Skip if already linked
  IF NEW.recaptured_from_appointment_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Find most recent lost appointment for same patient, same project, within 90 days,
  -- created BEFORE this appointment.
  SELECT lost.id INTO matched_id
  FROM public.all_appointments lost
  WHERE lost.id <> NEW.id
    AND lost.project_name = NEW.project_name
    AND COALESCE(lost.is_reserved_block, false) = false
    AND lost.status IS NOT NULL
    AND LOWER(TRIM(lost.status)) = ANY(lost_statuses)
    AND lost.created_at < NEW.created_at
    AND lost.created_at >= (NEW.created_at - INTERVAL '90 days')
    AND (
      (NEW.ghl_id IS NOT NULL AND lost.ghl_id = NEW.ghl_id)
      OR (NEW.lead_phone_number IS NOT NULL AND lost.lead_phone_number = NEW.lead_phone_number)
      OR (NEW.lead_email IS NOT NULL AND lost.lead_email = NEW.lead_email)
      OR (LOWER(TRIM(lost.lead_name)) = LOWER(TRIM(NEW.lead_name)))
    )
  ORDER BY lost.created_at DESC
  LIMIT 1;

  IF matched_id IS NOT NULL THEN
    NEW.recaptured_from_appointment_id := matched_id;
    NEW.recapture_detected_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_recapture_on_active ON public.all_appointments;
CREATE TRIGGER trg_link_recapture_on_active
BEFORE INSERT OR UPDATE OF status ON public.all_appointments
FOR EACH ROW
EXECUTE FUNCTION public.link_recapture_on_active();

-- 3. View: recapture_events
CREATE OR REPLACE VIEW public.recapture_events AS
WITH lost AS (
  SELECT id, lead_name, project_name, status, date_of_appointment, created_at,
         ghl_id, lead_phone_number, lead_email
  FROM public.all_appointments
  WHERE status IS NOT NULL
    AND LOWER(TRIM(status)) IN ('cancelled','canceled','no show','noshow','no-show','do not call','donotcall')
    AND COALESCE(is_reserved_block, false) = false
)
SELECT
  l.id                              AS lost_appointment_id,
  l.lead_name                       AS patient_name,
  l.project_name,
  l.status                          AS lost_status,
  l.date_of_appointment             AS lost_date,
  l.created_at                      AS lost_created_at,
  r.id                              AS recapture_appointment_id,
  r.status                          AS recapture_status,
  r.date_of_appointment             AS recapture_date,
  r.created_at                      AS recapture_created_at,
  r.procedure_ordered               AS recapture_procedure_ordered,
  CASE WHEN r.id IS NOT NULL
       THEN EXTRACT(DAY FROM (r.created_at - l.created_at))::int
  END                               AS days_to_recapture,
  CASE
    WHEN r.id IS NULL THEN 'not_recaptured'
    WHEN LOWER(TRIM(r.status)) IN ('showed','won') THEN 'showed'
    WHEN LOWER(TRIM(r.status)) IN ('cancelled','canceled','no show','noshow','no-show','do not call','donotcall') THEN 'lost_again'
    ELSE 'pending'
  END                               AS recapture_outcome
FROM lost l
LEFT JOIN LATERAL (
  SELECT a.*
  FROM public.all_appointments a
  WHERE a.recaptured_from_appointment_id = l.id
  ORDER BY a.created_at ASC
  LIMIT 1
) r ON true;

GRANT SELECT ON public.recapture_events TO authenticated;

-- 4. Backfill historical recaptures
WITH candidates AS (
  SELECT
    new_a.id AS new_id,
    (
      SELECT lost.id
      FROM public.all_appointments lost
      WHERE lost.id <> new_a.id
        AND lost.project_name = new_a.project_name
        AND COALESCE(lost.is_reserved_block, false) = false
        AND lost.status IS NOT NULL
        AND LOWER(TRIM(lost.status)) IN ('cancelled','canceled','no show','noshow','no-show','do not call','donotcall')
        AND lost.created_at < new_a.created_at
        AND lost.created_at >= (new_a.created_at - INTERVAL '90 days')
        AND (
          (new_a.ghl_id IS NOT NULL AND lost.ghl_id = new_a.ghl_id)
          OR (new_a.lead_phone_number IS NOT NULL AND lost.lead_phone_number = new_a.lead_phone_number)
          OR (new_a.lead_email IS NOT NULL AND lost.lead_email = new_a.lead_email)
          OR (LOWER(TRIM(lost.lead_name)) = LOWER(TRIM(new_a.lead_name)))
        )
      ORDER BY lost.created_at DESC
      LIMIT 1
    ) AS lost_id
  FROM public.all_appointments new_a
  WHERE COALESCE(new_a.is_reserved_block, false) = false
    AND COALESCE(new_a.is_superseded, false) = false
    AND new_a.recaptured_from_appointment_id IS NULL
    AND (new_a.status IS NULL
         OR LOWER(TRIM(new_a.status)) NOT IN ('cancelled','canceled','no show','noshow','no-show','do not call','donotcall'))
)
UPDATE public.all_appointments a
SET recaptured_from_appointment_id = c.lost_id,
    recapture_detected_at = now()
FROM candidates c
WHERE a.id = c.new_id
  AND c.lost_id IS NOT NULL;