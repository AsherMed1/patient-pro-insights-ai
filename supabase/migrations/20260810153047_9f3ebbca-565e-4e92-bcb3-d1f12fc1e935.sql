-- Canonical insurance plans
CREATE TABLE public.insurance_canonical_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canonical_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_canonical_plans TO authenticated;
GRANT ALL ON public.insurance_canonical_plans TO service_role;
ALTER TABLE public.insurance_canonical_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read canonical plans" ON public.insurance_canonical_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage canonical plans" ON public.insurance_canonical_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'));

-- Aliases
CREATE TABLE public.insurance_plan_aliases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.insurance_canonical_plans(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX insurance_plan_aliases_unique ON public.insurance_plan_aliases (lower(alias));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_plan_aliases TO authenticated;
GRANT ALL ON public.insurance_plan_aliases TO service_role;
ALTER TABLE public.insurance_plan_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read plan aliases" ON public.insurance_plan_aliases FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage plan aliases" ON public.insurance_plan_aliases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'));

-- Block rules
CREATE TABLE public.insurance_block_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('plan','group_number')),
  plan_id UUID REFERENCES public.insurance_canonical_plans(id) ON DELETE CASCADE,
  value TEXT,
  match_method TEXT NOT NULL DEFAULT 'exact' CHECK (match_method IN ('exact','prefix','contains','regex')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_block_rules TO authenticated;
GRANT ALL ON public.insurance_block_rules TO service_role;
ALTER TABLE public.insurance_block_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read block rules" ON public.insurance_block_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage block rules" ON public.insurance_block_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'));

-- Rule scopes (clinic / location / calendar)
CREATE TABLE public.insurance_block_rule_scopes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.insurance_block_rules(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  location TEXT,
  calendar_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX insurance_block_rule_scopes_rule_idx ON public.insurance_block_rule_scopes (rule_id);
CREATE INDEX insurance_block_rule_scopes_project_idx ON public.insurance_block_rule_scopes (project_name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_block_rule_scopes TO authenticated;
GRANT ALL ON public.insurance_block_rule_scopes TO service_role;
ALTER TABLE public.insurance_block_rule_scopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read rule scopes" ON public.insurance_block_rule_scopes FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage rule scopes" ON public.insurance_block_rule_scopes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'));

-- updated_at triggers
CREATE TRIGGER trg_icp_updated BEFORE UPDATE ON public.insurance_canonical_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ipa_updated BEFORE UPDATE ON public.insurance_plan_aliases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ibr_updated BEFORE UPDATE ON public.insurance_block_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ibrs_updated BEFORE UPDATE ON public.insurance_block_rule_scopes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Appointment flag columns
ALTER TABLE public.all_appointments
  ADD COLUMN IF NOT EXISTS potential_oon BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS potential_oon_matches JSONB,
  ADD COLUMN IF NOT EXISTS potential_oon_flagged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS potential_oon_resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS potential_oon_resolution TEXT,
  ADD COLUMN IF NOT EXISTS potential_oon_resolved_by UUID,
  ADD COLUMN IF NOT EXISTS potential_oon_resolution_reason TEXT;

CREATE INDEX IF NOT EXISTS all_appointments_potential_oon_idx ON public.all_appointments (potential_oon) WHERE potential_oon = true;