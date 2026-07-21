CREATE TABLE public.qa_error_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_seeded boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX qa_error_sources_name_ci_uniq ON public.qa_error_sources (LOWER(TRIM(name)));

GRANT SELECT, INSERT ON public.qa_error_sources TO authenticated;
GRANT ALL ON public.qa_error_sources TO service_role;

ALTER TABLE public.qa_error_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read error sources"
  ON public.qa_error_sources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "QA staff can add error sources"
  ON public.qa_error_sources FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'agent'::app_role)
    OR public.has_role(auth.uid(), 'qa_specialist'::app_role)
  );

INSERT INTO public.qa_error_sources (name, is_seeded) VALUES
  ('AI Ashley', true),
  ('AI Grace', true),
  ('AI Mark', true),
  ('Alexia Mitchell', true),
  ('Anyira Nova', true),
  ('Bianna', true),
  ('Blessy Espiritu', true),
  ('Chantel Mdletshe', true),
  ('Chris Gonzalez', true),
  ('Clinic Error', true),
  ('Clinic Update', true),
  ('Edward Fernandez', true),
  ('Fares Samy', true),
  ('Glen Lim', true),
  ('Jason Manangan', true),
  ('Jennifer Robb', true),
  ('Katherine Aquino', true),
  ('Kevin John Bejerano', true),
  ('Kim Anderson', true),
  ('Lucas Gianoli', true),
  ('Luis Nicolas Guzman', true),
  ('Mandy Mpehle', true),
  ('Marleny Marte', true),
  ('Nemesis Rodriguez', true),
  ('Ntombi Ngumbela', true),
  ('Patient Update', true),
  ('Portal Error', true),
  ('Raquelle Cailo', true),
  ('Ricardo Lopez', true),
  ('Rodrigo Castro', true),
  ('Samanta Tejeda', true),
  ('Silindele Njilo', true),
  ('Staecy Peña', true),
  ('Tennille Haig', true),
  ('Workflow', true),
  ('Yeimy Roa', true)
ON CONFLICT DO NOTHING;