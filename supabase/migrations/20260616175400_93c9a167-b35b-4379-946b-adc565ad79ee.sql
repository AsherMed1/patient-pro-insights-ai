ALTER TABLE public.all_appointments
  ADD COLUMN IF NOT EXISTS lead_phone_digits text
  GENERATED ALWAYS AS (regexp_replace(coalesce(lead_phone_number,''), '\D', '', 'g')) STORED;

CREATE INDEX IF NOT EXISTS idx_all_appointments_lead_phone_digits
  ON public.all_appointments (lead_phone_digits);