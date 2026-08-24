ALTER TABLE public.all_appointments
  ADD COLUMN IF NOT EXISTS welcome_call_state text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS welcome_call_attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS welcome_call_first_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS welcome_call_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS welcome_call_reached_at timestamptz,
  ADD COLUMN IF NOT EXISTS welcome_call_last_sms_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_all_appointments_welcome_call_state
  ON public.all_appointments (welcome_call_state);

CREATE INDEX IF NOT EXISTS idx_contact_attempts_appt_source
  ON public.appointment_contact_attempts (appointment_id, source);

CREATE OR REPLACE FUNCTION public.maintain_welcome_call_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source IS DISTINCT FROM 'welcome_call' THEN
    RETURN NEW;
  END IF;

  UPDATE public.all_appointments a
  SET
    welcome_call_attempt_count = COALESCE(a.welcome_call_attempt_count, 0) + 1,
    welcome_call_first_attempt_at = COALESCE(a.welcome_call_first_attempt_at, NEW.attempted_at),
    welcome_call_last_attempt_at = GREATEST(COALESCE(a.welcome_call_last_attempt_at, NEW.attempted_at), NEW.attempted_at),
    welcome_call_reached_at = CASE
      WHEN NEW.outcome = 'answered' THEN COALESCE(a.welcome_call_reached_at, NEW.attempted_at)
      ELSE a.welcome_call_reached_at END,
    welcome_call_state = CASE
      WHEN NEW.outcome = 'answered' OR a.welcome_call_reached_at IS NOT NULL THEN 'reached'
      ELSE 'attempted' END
  WHERE a.id = NEW.appointment_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintain_welcome_call_state ON public.appointment_contact_attempts;
CREATE TRIGGER trg_maintain_welcome_call_state
AFTER INSERT ON public.appointment_contact_attempts
FOR EACH ROW EXECUTE FUNCTION public.maintain_welcome_call_state();