
CREATE TABLE public.qa_error_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_seeded boolean NOT NULL DEFAULT false,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.qa_error_categories TO authenticated;
GRANT ALL ON public.qa_error_categories TO service_role;

ALTER TABLE public.qa_error_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read qa_error_categories"
  ON public.qa_error_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can add qa_error_categories"
  ON public.qa_error_categories FOR INSERT TO authenticated WITH CHECK (true);

INSERT INTO public.qa_error_categories (name, is_seeded) VALUES
  ('Missing Insurance', true),
  ('Missing Secondary Insurance', true),
  ('Notes Added to Portal', true),
  ('Notes Added to GHL', true),
  ('Duplicate Appointment', true),
  ('Booking Rule Violation', true),
  ('Uploaded Insurance Card', true),
  ('Name Correction', true),
  ('Double Booked', true),
  ('Triple Booked', true),
  ('Incorrect Patient Info', true),
  ('Clinic Notes / DND', true),
  ('Missing Address', true),
  ('Missing DOB', true),
  ('Missing PCP Info', true),
  ('No Email', true),
  ('Not on Portal', true),
  ('OON / Setter', true),
  ('Portal/GHL Sync Issue', true),
  ('Tech Ticket', true),
  ('Updated Portal Status', true),
  ('Wrong Location', true),
  ('Wrong Procedure', true)
ON CONFLICT (name) DO NOTHING;
