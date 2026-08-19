
ALTER TABLE public.all_appointments
  ADD COLUMN IF NOT EXISTS insurance_intake_source text,
  ADD COLUMN IF NOT EXISTS returned_reason text,
  ADD COLUMN IF NOT EXISTS returned_categories text[],
  ADD COLUMN IF NOT EXISTS returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS returned_by text,
  ADD COLUMN IF NOT EXISTS trainee_user_id uuid,
  ADD COLUMN IF NOT EXISTS trainee_name text;

CREATE INDEX IF NOT EXISTS idx_all_appointments_review_stage_status
  ON public.all_appointments (review_status, review_stage);

CREATE TABLE IF NOT EXISTS public.trainee_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  trainee_name text,
  trainee_email text,
  ghl_user_id text,
  start_date date not null default current_date,
  end_date date not null,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  extended_by uuid,
  extended_at timestamptz,
  ended_by uuid,
  ended_at timestamptz,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_trainee_periods_user_active ON public.trainee_periods (user_id, is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trainee_periods TO authenticated;
GRANT ALL ON public.trainee_periods TO service_role;

ALTER TABLE public.trainee_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainers and admins manage trainee periods" ON public.trainee_periods;
CREATE POLICY "Trainers and admins manage trainee periods"
ON public.trainee_periods FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent') OR public.has_role(auth.uid(), 'trainer'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent') OR public.has_role(auth.uid(), 'trainer'));

DROP POLICY IF EXISTS "Trainees can view their own period" ON public.trainee_periods;
CREATE POLICY "Trainees can view their own period"
ON public.trainee_periods FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER trg_trainee_periods_updated_at
BEFORE UPDATE ON public.trainee_periods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
