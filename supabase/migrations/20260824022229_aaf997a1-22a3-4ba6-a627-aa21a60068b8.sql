UPDATE public.clinic_supported_insurances SET service_line = '' WHERE service_line IS NULL;
ALTER TABLE public.clinic_supported_insurances ALTER COLUMN service_line SET DEFAULT '';
ALTER TABLE public.clinic_supported_insurances ALTER COLUMN service_line SET NOT NULL;
DROP INDEX IF EXISTS public.clinic_supported_insurances_unique_scope;
CREATE UNIQUE INDEX clinic_supported_insurances_unique_scope
  ON public.clinic_supported_insurances (project_name, normalized, service_line);