ALTER TABLE public.all_appointments
  ADD COLUMN IF NOT EXISTS review_stage text NOT NULL DEFAULT 'new';

ALTER TABLE public.all_appointments
  DROP CONSTRAINT IF EXISTS all_appointments_review_stage_check;

ALTER TABLE public.all_appointments
  ADD CONSTRAINT all_appointments_review_stage_check
  CHECK (review_stage IN ('new', 'pending_review'));

UPDATE public.all_appointments
  SET review_stage = 'new'
  WHERE review_status = 'pending' AND review_stage IS DISTINCT FROM 'pending_review';

CREATE INDEX IF NOT EXISTS idx_all_appointments_review_status_stage
  ON public.all_appointments (review_status, review_stage);