ALTER TABLE public.all_appointments
  ADD COLUMN IF NOT EXISTS parse_attempts integer NOT NULL DEFAULT 0;