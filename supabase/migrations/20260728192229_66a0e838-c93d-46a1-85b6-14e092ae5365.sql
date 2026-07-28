ALTER TABLE public.all_appointments
  ADD COLUMN IF NOT EXISTS decline_reason text,
  ADD COLUMN IF NOT EXISTS decline_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_all_appointments_decline_reason
  ON public.all_appointments (decline_reason)
  WHERE decline_reason IS NOT NULL;