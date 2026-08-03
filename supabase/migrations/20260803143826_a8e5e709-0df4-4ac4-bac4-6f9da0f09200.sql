CREATE TABLE IF NOT EXISTS public.recapture_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.all_appointments(id) ON DELETE SET NULL,
  ghl_contact_id text,
  project_name text NOT NULL,
  patient_name text,
  service_line text,
  lost_type text NOT NULL CHECK (lost_type IN ('cancelled', 'no_show')),
  lost_status_at_entry text,
  appointment_date timestamptz,
  entered_worklist_at timestamptz NOT NULL DEFAULT now(),
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  work_started_at timestamptz,
  work_status text NOT NULL DEFAULT 'pending' CHECK (work_status IN ('pending', 'engaging', 'follow_up_required', 'completed')),
  outcome text CHECK (outcome IN ('rebooked', 'interested', 'unable_to_reach', 'declined_rebook', 'scheduled_elsewhere', 'not_interested', 'dnc_requested', 'invalid_contact', 'other')),
  outcome_notes text,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rebooked_appointment_id uuid REFERENCES public.all_appointments(id) ON DELETE SET NULL,
  recovered boolean NOT NULL DEFAULT false,
  attempt_count integer NOT NULL DEFAULT 0,
  first_attempt_at timestamptz,
  last_attempt_at timestamptz,
  stale boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS recapture_cases_dedup_active
  ON public.recapture_cases (appointment_id)
  WHERE work_status <> 'completed' AND appointment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS recapture_cases_project_idx ON public.recapture_cases(project_name);
CREATE INDEX IF NOT EXISTS recapture_cases_work_status_idx ON public.recapture_cases(work_status);
CREATE INDEX IF NOT EXISTS recapture_cases_lost_type_idx ON public.recapture_cases(lost_type);
CREATE INDEX IF NOT EXISTS recapture_cases_entered_idx ON public.recapture_cases(entered_worklist_at DESC);
CREATE INDEX IF NOT EXISTS recapture_cases_assigned_idx ON public.recapture_cases(assigned_user_id);
CREATE INDEX IF NOT EXISTS recapture_cases_recovered_idx ON public.recapture_cases(recovered) WHERE recovered = true;

CREATE TABLE IF NOT EXISTS public.recapture_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.recapture_cases(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('call', 'text', 'email', 'voicemail')),
  attempted_at timestamptz NOT NULL DEFAULT now(),
  result text CHECK (result IN ('answered', 'voicemail', 'no_answer', 'busy', 'disconnected', 'wrong_number', 'callback_requested', 'not_interested', 'other')),
  note text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recapture_attempts_case_idx ON public.recapture_attempts(case_id, attempted_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recapture_cases TO authenticated;
GRANT ALL ON public.recapture_cases TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recapture_attempts TO authenticated;
GRANT ALL ON public.recapture_attempts TO service_role;

ALTER TABLE public.recapture_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recapture_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_recapture_case_access(_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.recapture_cases c
    WHERE c.id = _case_id
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'agent'::app_role)
        OR public.has_role(auth.uid(), 'va'::app_role)
        OR (
          public.has_role(auth.uid(), 'review_only'::app_role)
          AND EXISTS (
            SELECT 1
            FROM public.project_user_access pua
            JOIN public.projects p ON p.id = pua.project_id
            WHERE pua.user_id = auth.uid()
              AND p.project_name = c.project_name
          )
        )
      )
  )
$$;

CREATE POLICY recapture_cases_admin_full ON public.recapture_cases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role) OR public.has_role(auth.uid(), 'va'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role) OR public.has_role(auth.uid(), 'va'::app_role));

CREATE POLICY recapture_cases_setter_select ON public.recapture_cases
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'review_only'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.project_user_access pua
      JOIN public.projects p ON p.id = pua.project_id
      WHERE pua.user_id = auth.uid()
        AND p.project_name = recapture_cases.project_name
    )
  );

CREATE POLICY recapture_cases_setter_update ON public.recapture_cases
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'review_only'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.project_user_access pua
      JOIN public.projects p ON p.id = pua.project_id
      WHERE pua.user_id = auth.uid()
        AND p.project_name = recapture_cases.project_name
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'review_only'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.project_user_access pua
      JOIN public.projects p ON p.id = pua.project_id
      WHERE pua.user_id = auth.uid()
        AND p.project_name = recapture_cases.project_name
    )
  );

CREATE POLICY recapture_attempts_access ON public.recapture_attempts
  FOR SELECT TO authenticated
  USING (public.has_recapture_case_access(case_id));

CREATE POLICY recapture_attempts_insert ON public.recapture_attempts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_recapture_case_access(case_id));

CREATE POLICY recapture_attempts_update ON public.recapture_attempts
  FOR UPDATE TO authenticated
  USING (public.has_recapture_case_access(case_id) AND user_id = auth.uid())
  WITH CHECK (public.has_recapture_case_access(case_id) AND user_id = auth.uid());

CREATE POLICY recapture_attempts_delete ON public.recapture_attempts
  FOR DELETE TO authenticated
  USING (public.has_recapture_case_access(case_id) AND user_id = auth.uid());

CREATE TRIGGER recapture_cases_updated_at
  BEFORE UPDATE ON public.recapture_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER recapture_attempts_updated_at
  BEFORE UPDATE ON public.recapture_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.recapture_maintain_attempt_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.recapture_cases
    SET attempt_count = attempt_count + 1,
        first_attempt_at = COALESCE(first_attempt_at, NEW.attempted_at),
        last_attempt_at = NEW.attempted_at,
        updated_at = now()
    WHERE id = NEW.case_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.recapture_cases
    SET attempt_count = GREATEST(attempt_count - 1, 0),
        first_attempt_at = (SELECT MIN(attempted_at) FROM public.recapture_attempts WHERE case_id = OLD.case_id),
        last_attempt_at = (SELECT MAX(attempted_at) FROM public.recapture_attempts WHERE case_id = OLD.case_id),
        updated_at = now()
    WHERE id = OLD.case_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.recapture_cases
    SET last_attempt_at = (SELECT MAX(attempted_at) FROM public.recapture_attempts WHERE case_id = NEW.case_id),
        updated_at = now()
    WHERE id = NEW.case_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recapture_maintain_attempt_stats_trg ON public.recapture_attempts;
CREATE TRIGGER recapture_maintain_attempt_stats_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.recapture_attempts
  FOR EACH ROW EXECUTE FUNCTION public.recapture_maintain_attempt_stats();

CREATE OR REPLACE FUNCTION public.recapture_upsert_case(
  _appointment_id uuid,
  _ghl_contact_id text,
  _project_name text,
  _patient_name text,
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
        service_line = COALESCE(_service_line, service_line),
        stale = false,
        updated_at = now()
    WHERE id = existing_id;
    RETURN existing_id;
  END IF;

  INSERT INTO public.recapture_cases (
    appointment_id, ghl_contact_id, project_name, patient_name, service_line,
    lost_type, lost_status_at_entry, appointment_date
  ) VALUES (
    _appointment_id, _ghl_contact_id, _project_name, _patient_name, _service_line,
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
    NEW.calendar_name,
      lost_type,
      NEW.status,
      appt_ts
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.recapture_mark_recovered_on_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    changed := NEW.recaptured_from_appointment_id IS NOT NULL;
  ELSE
    changed := COALESCE(NEW.recaptured_from_appointment_id, '') <> COALESCE(OLD.recaptured_from_appointment_id, '');
  END IF;

  IF changed AND NEW.recaptured_from_appointment_id IS NOT NULL THEN
    UPDATE public.recapture_cases
    SET recovered = true,
        rebooked_appointment_id = NEW.id,
        work_status = 'completed',
        outcome = COALESCE(outcome, 'rebooked'),
        completed_at = COALESCE(completed_at, now()),
        updated_at = now()
    WHERE appointment_id = NEW.recaptured_from_appointment_id
      AND recovered = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recapture_mark_recovered_on_link_trg ON public.all_appointments;
CREATE TRIGGER recapture_mark_recovered_on_link_trg
  AFTER INSERT OR UPDATE ON public.all_appointments
  FOR EACH ROW EXECUTE FUNCTION public.recapture_mark_recovered_on_link();

CREATE OR REPLACE FUNCTION public.recapture_mark_stale_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_status text;
  lost_statuses text[] := ARRAY['cancelled','canceled','no show','noshow','no-show'];
BEGIN
  new_status := LOWER(TRIM(COALESCE(NEW.status, '')));
  IF new_status = LOWER(TRIM(COALESCE(OLD.status, ''))) THEN
    RETURN NEW;
  END IF;

  IF new_status <> ALL(lost_statuses) THEN
    UPDATE public.recapture_cases
    SET stale = true,
        updated_at = now()
    WHERE appointment_id = NEW.id
      AND work_status <> 'completed'
      AND stale = false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recapture_mark_stale_on_status_change_trg ON public.all_appointments;
CREATE TRIGGER recapture_mark_stale_on_status_change_trg
  AFTER UPDATE OF status ON public.all_appointments
  FOR EACH ROW EXECUTE FUNCTION public.recapture_mark_stale_on_status_change();

INSERT INTO public.recapture_cases (
  appointment_id, ghl_contact_id, project_name, patient_name, service_line,
  lost_type, lost_status_at_entry, appointment_date, entered_worklist_at
)
SELECT
  a.id,
  a.ghl_id,
  a.project_name,
  a.lead_name,
  a.calendar_name,
  CASE WHEN LOWER(TRIM(a.status)) IN ('cancelled','canceled') THEN 'cancelled' ELSE 'no_show' END,
  a.status,
  CASE WHEN a.date_of_appointment IS NOT NULL
       THEN (a.date_of_appointment::text || ' ' || COALESCE(a.requested_time, '00:00:00'))::timestamptz
       ELSE NULL END,
  COALESCE(a.updated_at, a.created_at, now())
FROM public.all_appointments a
WHERE a.status IS NOT NULL
  AND LOWER(TRIM(a.status)) IN ('cancelled','canceled','no show','noshow','no-show')
  AND COALESCE(a.is_reserved_block, false) = false
  AND COALESCE(a.is_superseded, false) = false
  AND a.created_at >= now() - INTERVAL '90 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.recapture_cases rc
    WHERE rc.appointment_id = a.id
  )
ON CONFLICT DO NOTHING;