ALTER TABLE public.all_appointments
  ADD COLUMN IF NOT EXISTS referral_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS referral_status text,
  ADD COLUMN IF NOT EXISTS referral_history jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_all_appointments_referral_status
  ON public.all_appointments (referral_status)
  WHERE referral_status IS NOT NULL;