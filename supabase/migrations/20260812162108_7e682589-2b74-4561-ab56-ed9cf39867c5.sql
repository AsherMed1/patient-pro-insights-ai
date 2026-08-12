CREATE TABLE public.appointment_contact_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.all_appointments(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  channel text NOT NULL DEFAULT 'call',
  outcome text NOT NULL DEFAULT 'no_answer',
  note text,
  user_id uuid,
  user_name text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_appt_contact_attempts_appt ON public.appointment_contact_attempts (appointment_id, attempted_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_contact_attempts TO authenticated;
GRANT ALL ON public.appointment_contact_attempts TO service_role;

ALTER TABLE public.appointment_contact_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and agents manage contact attempts"
ON public.appointment_contact_attempts FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Staff view contact attempts"
ON public.appointment_contact_attempts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'agent'::app_role)
  OR has_role(auth.uid(), 'va'::app_role)
  OR has_role(auth.uid(), 'review_only'::app_role)
  OR has_role(auth.uid(), 'qa_specialist'::app_role)
  OR has_role(auth.uid(), 'recapture'::app_role)
);

CREATE POLICY "Staff insert contact attempts"
ON public.appointment_contact_attempts FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'agent'::app_role)
  OR has_role(auth.uid(), 'va'::app_role)
  OR has_role(auth.uid(), 'review_only'::app_role)
  OR has_role(auth.uid(), 'qa_specialist'::app_role)
  OR has_role(auth.uid(), 'recapture'::app_role)
);

CREATE TRIGGER update_appointment_contact_attempts_updated_at
BEFORE UPDATE ON public.appointment_contact_attempts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();