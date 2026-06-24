CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_all_appointments_lead_name_trgm
  ON public.all_appointments USING gin (lead_name gin_trgm_ops)
  WHERE lead_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_appointments_lead_email_trgm
  ON public.all_appointments USING gin (lead_email gin_trgm_ops)
  WHERE lead_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_appointments_lead_phone_digits_trgm
  ON public.all_appointments USING gin (lead_phone_digits gin_trgm_ops)
  WHERE lead_phone_digits IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_appointments_project_review_reserved_created
  ON public.all_appointments (project_name, review_status, is_reserved_block, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_all_appointments_project_review_status
  ON public.all_appointments (project_name, review_status, status);