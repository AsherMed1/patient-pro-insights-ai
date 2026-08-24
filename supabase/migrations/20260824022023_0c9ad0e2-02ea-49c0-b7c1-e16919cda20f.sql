ALTER TABLE public.insurance_block_rule_scopes ADD COLUMN IF NOT EXISTS service_line text;
ALTER TABLE public.clinic_supported_insurances ADD COLUMN IF NOT EXISTS service_line text;

ALTER TABLE public.clinic_supported_insurances DROP CONSTRAINT IF EXISTS clinic_supported_insurances_project_name_normalized_key;
CREATE UNIQUE INDEX IF NOT EXISTS clinic_supported_insurances_unique_scope
  ON public.clinic_supported_insurances (project_name, normalized, coalesce(service_line, ''));