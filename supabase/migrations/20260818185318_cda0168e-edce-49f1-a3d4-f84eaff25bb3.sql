ALTER TABLE public.all_appointments
  ADD COLUMN IF NOT EXISTS decline_ghl_cancel_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS decline_ghl_cancel_error text;