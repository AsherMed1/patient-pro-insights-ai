
-- 1. Extend alert_type to allow confirmed_audit
ALTER TABLE public.qa_cases DROP CONSTRAINT IF EXISTS qa_cases_alert_type_check;
ALTER TABLE public.qa_cases ADD CONSTRAINT qa_cases_alert_type_check
  CHECK (alert_type = ANY (ARRAY['short_notice','oon','cancelled','no_show','confirmed_audit']));

-- 2. New audit-sheet columns
ALTER TABLE public.qa_cases
  ADD COLUMN IF NOT EXISTS qa_name text,
  ADD COLUMN IF NOT EXISTS self_booked boolean,
  ADD COLUMN IF NOT EXISTS patient_link text,
  ADD COLUMN IF NOT EXISTS error_category text,
  ADD COLUMN IF NOT EXISTS error_source text,
  ADD COLUMN IF NOT EXISTS caught_before_clinic boolean,
  ADD COLUMN IF NOT EXISTS resolution_type text,
  ADD COLUMN IF NOT EXISTS date_resolved timestamptz,
  ADD COLUMN IF NOT EXISTS ticket_created boolean NOT NULL DEFAULT false;

ALTER TABLE public.qa_cases DROP CONSTRAINT IF EXISTS qa_cases_error_category_check;
ALTER TABLE public.qa_cases ADD CONSTRAINT qa_cases_error_category_check
  CHECK (error_category IS NULL OR error_category = ANY (ARRAY[
    'Missing Insurance','Notes Added to Portal','Duplicate Appointment',
    'Booking Rule Violation','Uploaded Insurance Card','Name Correction',
    'Double Booked','Incorrect Patient Info','Other'
  ]));

ALTER TABLE public.qa_cases DROP CONSTRAINT IF EXISTS qa_cases_resolution_type_check;
ALTER TABLE public.qa_cases ADD CONSTRAINT qa_cases_resolution_type_check
  CHECK (resolution_type IS NULL OR resolution_type = ANY (ARRAY[
    'Resolved by QA','Escalated to AM','Other'
  ]));

-- Backfill ticket_created from existing ControlHub ticket IDs
UPDATE public.qa_cases
   SET ticket_created = true
 WHERE controlhub_ticket_id IS NOT NULL
   AND ticket_created = false;

-- 3. Auto-maintain date_resolved / ticket_created
CREATE OR REPLACE FUNCTION public.qa_cases_maintain_derived()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.workflow_status = 'completed' AND NEW.date_resolved IS NULL THEN
    NEW.date_resolved := COALESCE(NEW.completed_at, now());
  ELSIF NEW.workflow_status <> 'completed' AND OLD IS NOT NULL AND OLD.workflow_status = 'completed' THEN
    -- reopened: clear date_resolved
    NEW.date_resolved := NULL;
  END IF;

  NEW.ticket_created := (NEW.controlhub_ticket_id IS NOT NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qa_cases_maintain_derived ON public.qa_cases;
CREATE TRIGGER trg_qa_cases_maintain_derived
  BEFORE INSERT OR UPDATE ON public.qa_cases
  FOR EACH ROW EXECUTE FUNCTION public.qa_cases_maintain_derived();

-- 4. Lightweight metrics-only events log for cancellations / no-shows
CREATE TABLE IF NOT EXISTS public.qa_metrics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.all_appointments(id) ON DELETE SET NULL,
  project_name text NOT NULL,
  patient_name text,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['cancelled','no_show'])),
  appointment_status text,
  appointment_date timestamptz,
  was_ever_confirmed boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.qa_metrics_events TO authenticated;
GRANT ALL ON public.qa_metrics_events TO service_role;
ALTER TABLE public.qa_metrics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "QA metrics events readable by admins and QA" ON public.qa_metrics_events;
CREATE POLICY "QA metrics events readable by admins and QA"
  ON public.qa_metrics_events FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'agent')
    OR public.has_role(auth.uid(), 'qa_specialist')
  );

CREATE INDEX IF NOT EXISTS idx_qa_metrics_events_project_created
  ON public.qa_metrics_events (project_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_metrics_events_type_created
  ON public.qa_metrics_events (event_type, created_at DESC);

-- 5. Rewrite qa_ingest_terminal_status:
--    - OON continues to create a case
--    - Cancelled / No Show (post-confirmation) now only log a metrics event, NOT a case
CREATE OR REPLACE FUNCTION public.qa_ingest_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

    appt_ts := CASE WHEN NEW.date_of_appointment IS NOT NULL
                    THEN (NEW.date_of_appointment::text || ' ' || COALESCE(NEW.requested_time, '00:00:00'))::timestamptz
                    ELSE NULL END;

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
$$;

-- 6. New trigger: create a confirmed_audit case on transition to Confirmed
CREATE OR REPLACE FUNCTION public.qa_ingest_confirmed_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_status text;
  old_status text;
  appt_ts timestamptz;
BEGIN
  BEGIN
    new_status := LOWER(TRIM(COALESCE(NEW.status, '')));
    old_status := LOWER(TRIM(COALESCE(OLD.status, '')));
    IF new_status <> 'confirmed' OR new_status = old_status THEN
      RETURN NEW;
    END IF;
    IF COALESCE(NEW.is_reserved_block, false) = true OR COALESCE(NEW.is_superseded, false) = true THEN
      RETURN NEW;
    END IF;

    appt_ts := CASE WHEN NEW.date_of_appointment IS NOT NULL
                    THEN (NEW.date_of_appointment::text || ' ' || COALESCE(NEW.requested_time, '00:00:00'))::timestamptz
                    ELSE NULL END;

    PERFORM public.qa_upsert_case(
      NEW.id, NEW.ghl_id, NEW.project_name, NEW.lead_name,
      COALESCE(NEW.procedure_type, NEW.calendar_name),
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
$$;

DROP TRIGGER IF EXISTS trg_qa_ingest_confirmed_audit ON public.all_appointments;
CREATE TRIGGER trg_qa_ingest_confirmed_audit
  AFTER UPDATE OF status ON public.all_appointments
  FOR EACH ROW EXECUTE FUNCTION public.qa_ingest_confirmed_audit();
