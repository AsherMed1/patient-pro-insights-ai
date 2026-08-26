CREATE TABLE public.project_short_notice_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  service_line text,
  location text,
  threshold_hours integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_short_notice_rules TO authenticated;
GRANT ALL ON public.project_short_notice_rules TO service_role;

ALTER TABLE public.project_short_notice_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read short notice rules"
  ON public.project_short_notice_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and agents manage short notice rules"
  ON public.project_short_notice_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'));

CREATE UNIQUE INDEX project_short_notice_rules_unique
  ON public.project_short_notice_rules (project_name, coalesce(service_line, ''), coalesce(location, ''));

CREATE INDEX project_short_notice_rules_project_idx
  ON public.project_short_notice_rules (project_name) WHERE is_active;

CREATE TRIGGER update_project_short_notice_rules_updated_at
  BEFORE UPDATE ON public.project_short_notice_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.short_notice_alerts ADD COLUMN IF NOT EXISTS threshold_hours integer;