-- qa_cases
CREATE TABLE IF NOT EXISTS public.qa_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.all_appointments(id) ON DELETE SET NULL,
  ghl_contact_id text,
  project_name text NOT NULL,
  patient_name text,
  service_line text,
  appointment_date timestamptz,
  appointment_status text,
  alert_type text NOT NULL CHECK (alert_type IN ('short_notice','oon','cancelled','no_show')),
  alert_source_id uuid,
  workflow_status text NOT NULL DEFAULT 'new' CHECK (workflow_status IN ('new','in_review','pending_escalated','completed','reopened')),
  assigned_qs_user_id uuid,
  entered_queue_at timestamptz NOT NULL DEFAULT now(),
  review_started_at timestamptz,
  completed_at timestamptz,
  completed_by_user_id uuid,
  controlhub_ticket_id text,
  controlhub_ticket_status text,
  controlhub_ticket_url text,
  last_alert_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS qa_cases_dedup_active
  ON public.qa_cases (COALESCE(appointment_id::text, ghl_contact_id, id::text), alert_type)
  WHERE workflow_status <> 'completed';

CREATE INDEX IF NOT EXISTS qa_cases_project_idx ON public.qa_cases(project_name);
CREATE INDEX IF NOT EXISTS qa_cases_workflow_idx ON public.qa_cases(workflow_status);
CREATE INDEX IF NOT EXISTS qa_cases_entered_idx ON public.qa_cases(entered_queue_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qa_cases TO authenticated;
GRANT ALL ON public.qa_cases TO service_role;
ALTER TABLE public.qa_cases ENABLE ROW LEVEL SECURITY;

-- qa_case_activity
CREATE TABLE IF NOT EXISTS public.qa_case_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.qa_cases(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qa_case_activity_case_idx ON public.qa_case_activity(case_id, created_at DESC);
GRANT SELECT, INSERT ON public.qa_case_activity TO authenticated;
GRANT ALL ON public.qa_case_activity TO service_role;
ALTER TABLE public.qa_case_activity ENABLE ROW LEVEL SECURITY;

-- qa_case_notes
CREATE TABLE IF NOT EXISTS public.qa_case_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.qa_cases(id) ON DELETE CASCADE,
  note text NOT NULL,
  author_user_id uuid,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qa_case_notes_case_idx ON public.qa_case_notes(case_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qa_case_notes TO authenticated;
GRANT ALL ON public.qa_case_notes TO service_role;
ALTER TABLE public.qa_case_notes ENABLE ROW LEVEL SECURITY;

-- Access helper
CREATE OR REPLACE FUNCTION public.has_qa_case_access(_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.qa_cases c
    WHERE c.id = _case_id
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'agent'::app_role)
        OR (
          public.has_role(auth.uid(), 'qa_specialist'::app_role)
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

-- Policies on qa_cases
CREATE POLICY qa_cases_admin_full ON public.qa_cases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY qa_cases_specialist_select ON public.qa_cases
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'qa_specialist'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.project_user_access pua
      JOIN public.projects p ON p.id = pua.project_id
      WHERE pua.user_id = auth.uid()
        AND p.project_name = qa_cases.project_name
    )
  );

CREATE POLICY qa_cases_specialist_update ON public.qa_cases
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'qa_specialist'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.project_user_access pua
      JOIN public.projects p ON p.id = pua.project_id
      WHERE pua.user_id = auth.uid()
        AND p.project_name = qa_cases.project_name
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'qa_specialist'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.project_user_access pua
      JOIN public.projects p ON p.id = pua.project_id
      WHERE pua.user_id = auth.uid()
        AND p.project_name = qa_cases.project_name
    )
  );

CREATE POLICY qa_case_activity_access ON public.qa_case_activity
  FOR SELECT TO authenticated
  USING (public.has_qa_case_access(case_id));

CREATE POLICY qa_case_activity_insert ON public.qa_case_activity
  FOR INSERT TO authenticated
  WITH CHECK (public.has_qa_case_access(case_id));

CREATE POLICY qa_case_notes_access ON public.qa_case_notes
  FOR SELECT TO authenticated
  USING (public.has_qa_case_access(case_id));

CREATE POLICY qa_case_notes_insert ON public.qa_case_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_qa_case_access(case_id));

CREATE POLICY qa_case_notes_update ON public.qa_case_notes
  FOR UPDATE TO authenticated
  USING (public.has_qa_case_access(case_id) AND author_user_id = auth.uid())
  WITH CHECK (public.has_qa_case_access(case_id) AND author_user_id = auth.uid());

CREATE POLICY qa_case_notes_delete ON public.qa_case_notes
  FOR DELETE TO authenticated
  USING (public.has_qa_case_access(case_id) AND author_user_id = auth.uid());

CREATE TRIGGER qa_cases_updated_at
  BEFORE UPDATE ON public.qa_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Upsert helper: dedup / reopen
CREATE OR REPLACE FUNCTION public.qa_upsert_case(
  _appointment_id uuid,
  _ghl_contact_id text,
  _project_name text,
  _patient_name text,
  _service_line text,
  _appointment_date timestamptz,
  _appointment_status text,
  _alert_type text,
  _alert_source_id uuid,
  _activity_description text
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
  IF _project_name IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO existing_id
  FROM public.qa_cases
  WHERE alert_type = _alert_type
    AND workflow_status <> 'completed'
    AND (
      (_appointment_id IS NOT NULL AND appointment_id = _appointment_id)
      OR (_appointment_id IS NULL AND _ghl_contact_id IS NOT NULL AND ghl_contact_id = _ghl_contact_id)
    )
  ORDER BY entered_queue_at DESC
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.qa_cases
      SET last_alert_activity_at = now(),
          appointment_status = COALESCE(_appointment_status, appointment_status),
          appointment_date = COALESCE(_appointment_date, appointment_date),
          patient_name = COALESCE(_patient_name, patient_name),
          service_line = COALESCE(_service_line, service_line),
          updated_at = now()
      WHERE id = existing_id;

    INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
    VALUES (existing_id, 'alert_repeat', COALESCE(_activity_description, 'Repeat alert'),
            jsonb_build_object('alert_type', _alert_type, 'alert_source_id', _alert_source_id));

    RETURN existing_id;
  END IF;

  SELECT id INTO existing_id
  FROM public.qa_cases
  WHERE alert_type = _alert_type
    AND workflow_status = 'completed'
    AND (
      (_appointment_id IS NOT NULL AND appointment_id = _appointment_id)
      OR (_appointment_id IS NULL AND _ghl_contact_id IS NOT NULL AND ghl_contact_id = _ghl_contact_id)
    )
  ORDER BY completed_at DESC
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.qa_cases
      SET workflow_status = 'reopened',
          last_alert_activity_at = now(),
          appointment_status = COALESCE(_appointment_status, appointment_status),
          updated_at = now()
      WHERE id = existing_id;

    INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
    VALUES (existing_id, 'reopened', 'Case reopened due to new activity',
            jsonb_build_object('alert_type', _alert_type, 'alert_source_id', _alert_source_id));

    RETURN existing_id;
  END IF;

  INSERT INTO public.qa_cases (
    appointment_id, ghl_contact_id, project_name, patient_name, service_line,
    appointment_date, appointment_status, alert_type, alert_source_id
  ) VALUES (
    _appointment_id, _ghl_contact_id, _project_name, _patient_name, _service_line,
    _appointment_date, _appointment_status, _alert_type, _alert_source_id
  )
  RETURNING id INTO new_id;

  INSERT INTO public.qa_case_activity (case_id, activity_type, description, metadata)
  VALUES (new_id, 'created', COALESCE(_activity_description, 'Case created from alert'),
          jsonb_build_object('alert_type', _alert_type, 'alert_source_id', _alert_source_id));

  RETURN new_id;
END;
$$;

-- Short-notice ingestion
CREATE OR REPLACE FUNCTION public.qa_ingest_short_notice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  appt RECORD;
BEGIN
  SELECT a.id, a.ghl_id, a.project_name, a.lead_name, a.procedure_type,
         a.calendar_name, a.date_of_appointment, a.requested_time, a.status
    INTO appt
    FROM public.all_appointments a
   WHERE a.id = NEW.appointment_id
   LIMIT 1;

  IF appt.id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.qa_upsert_case(
    appt.id,
    appt.ghl_id,
    appt.project_name,
    appt.lead_name,
    COALESCE(appt.procedure_type, appt.calendar_name),
    CASE WHEN appt.date_of_appointment IS NOT NULL
         THEN (appt.date_of_appointment::text || ' ' || COALESCE(appt.requested_time, '00:00:00'))::timestamptz
         ELSE NULL END,
    appt.status,
    'short_notice',
    NEW.id,
    'Short-notice booking alert'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS qa_ingest_short_notice_trg ON public.short_notice_alerts;
CREATE TRIGGER qa_ingest_short_notice_trg
  AFTER INSERT ON public.short_notice_alerts
  FOR EACH ROW EXECUTE FUNCTION public.qa_ingest_short_notice();

-- Terminal status ingestion
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
    COALESCE(NEW.procedure_type, NEW.calendar_name),
    appt_ts,
    NEW.status,
    alert_type,
    NULL,
    format('Status changed to %s', NEW.status)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS qa_ingest_terminal_status_trg ON public.all_appointments;
CREATE TRIGGER qa_ingest_terminal_status_trg
  AFTER UPDATE OF status ON public.all_appointments
  FOR EACH ROW EXECUTE FUNCTION public.qa_ingest_terminal_status();