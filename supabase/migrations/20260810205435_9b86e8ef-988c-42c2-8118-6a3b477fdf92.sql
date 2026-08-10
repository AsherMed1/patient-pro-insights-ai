CREATE TABLE public.clinic_supported_insurances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  raw_option text NOT NULL,
  normalized text NOT NULL,
  plan_id uuid REFERENCES public.insurance_canonical_plans(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'ghl',
  is_unknown_option boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_name, normalized)
);

GRANT SELECT ON public.clinic_supported_insurances TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clinic_supported_insurances TO authenticated;
GRANT ALL ON public.clinic_supported_insurances TO service_role;

ALTER TABLE public.clinic_supported_insurances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view supported insurances"
  ON public.clinic_supported_insurances FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage supported insurances"
  ON public.clinic_supported_insurances FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_clinic_supported_insurances_project
  ON public.clinic_supported_insurances (project_name) WHERE active;

CREATE TRIGGER update_clinic_supported_insurances_updated_at
  BEFORE UPDATE ON public.clinic_supported_insurances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS oon_mode text NOT NULL DEFAULT 'denylist';