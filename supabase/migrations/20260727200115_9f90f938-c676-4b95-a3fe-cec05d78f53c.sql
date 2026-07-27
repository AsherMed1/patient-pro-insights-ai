ALTER TABLE public.all_appointments
  ADD COLUMN IF NOT EXISTS reschedule_eligible boolean,
  ADD COLUMN IF NOT EXISTS reschedule_block_reason text,
  ADD COLUMN IF NOT EXISTS reschedule_blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS reschedule_blocked_by text;

CREATE TABLE IF NOT EXISTS public.patient_reschedule_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_contact_id text,
  project_name text NOT NULL,
  patient_name text,
  lead_phone_number text,
  source_appointment_id uuid REFERENCES public.all_appointments(id) ON DELETE SET NULL,
  reason text,
  blocked_by text,
  is_active boolean NOT NULL DEFAULT true,
  unblocked_by text,
  unblocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_reschedule_blocks TO authenticated;
GRANT ALL ON public.patient_reschedule_blocks TO service_role;

ALTER TABLE public.patient_reschedule_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reschedule blocks"
  ON public.patient_reschedule_blocks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create reschedule blocks"
  ON public.patient_reschedule_blocks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update reschedule blocks"
  ON public.patient_reschedule_blocks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can delete reschedule blocks"
  ON public.patient_reschedule_blocks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_prb_active_contact
  ON public.patient_reschedule_blocks(ghl_contact_id, project_name)
  WHERE is_active = true AND ghl_contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prb_active_phone
  ON public.patient_reschedule_blocks(lead_phone_number, project_name)
  WHERE is_active = true;

CREATE TRIGGER trg_prb_updated_at
  BEFORE UPDATE ON public.patient_reschedule_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_reschedule_blocked(_ghl_contact_id text, _project_name text, _phone text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patient_reschedule_blocks b
    WHERE b.is_active = true
      AND b.project_name = _project_name
      AND (
        (_ghl_contact_id IS NOT NULL AND b.ghl_contact_id = _ghl_contact_id)
        OR (_phone IS NOT NULL AND b.lead_phone_number = _phone)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.link_recapture_on_active()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lost_statuses text[] := ARRAY['cancelled','canceled','no show','noshow','no-show','do not call','donotcall'];
  is_active boolean;
  matched_id uuid;
BEGIN
  IF COALESCE(NEW.is_reserved_block, false) = true OR COALESCE(NEW.is_superseded, false) = true THEN
    RETURN NEW;
  END IF;

  is_active := NEW.status IS NULL
    OR LOWER(TRIM(NEW.status)) <> ALL(lost_statuses);

  IF NOT is_active THEN
    RETURN NEW;
  END IF;

  IF NEW.recaptured_from_appointment_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Skip recapture linking entirely for patients blocked from rescheduling
  IF public.is_reschedule_blocked(NEW.ghl_id, NEW.project_name, NEW.lead_phone_number) THEN
    RETURN NEW;
  END IF;

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
    )
  ORDER BY lost.created_at DESC
  LIMIT 1;

  IF matched_id IS NOT NULL THEN
    NEW.recaptured_from_appointment_id := matched_id;
    NEW.recapture_detected_at := now();
  END IF;

  RETURN NEW;
END;
$function$;