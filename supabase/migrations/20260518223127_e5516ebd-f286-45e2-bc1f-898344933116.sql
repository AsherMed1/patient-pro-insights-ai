
ALTER TABLE public.all_appointments
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_notes text;

DO $$ BEGIN
  ALTER TABLE public.all_appointments
    ADD CONSTRAINT all_appointments_review_status_check
    CHECK (review_status IN ('pending','approved','declined','oon'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.all_appointments
SET review_status = 'approved',
    reviewed_at = COALESCE(reviewed_at, now())
WHERE review_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_all_appointments_review_status
  ON public.all_appointments (review_status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.appointment_review_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.all_appointments(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('approved','declined','oon','reopened')),
  prior_status text,
  actor_id uuid,
  actor_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arh_appointment ON public.appointment_review_history (appointment_id, created_at DESC);

ALTER TABLE public.appointment_review_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Management can view review history" ON public.appointment_review_history;
CREATE POLICY "Management can view review history"
  ON public.appointment_review_history FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'agent')
    OR public.has_role(auth.uid(), 'va')
  );

DROP POLICY IF EXISTS "Management can insert review history" ON public.appointment_review_history;
CREATE POLICY "Management can insert review history"
  ON public.appointment_review_history FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'agent')
    OR public.has_role(auth.uid(), 'va')
  );
