ALTER TABLE public.all_appointments
  ADD COLUMN IF NOT EXISTS dob_rejected_value text,
  ADD COLUMN IF NOT EXISTS dob_rejected_at timestamptz;

COMMENT ON COLUMN public.all_appointments.dob_rejected_value IS 'Raw date of birth received from GHL/intake that failed the plausibility guard and was not stored as dob.';