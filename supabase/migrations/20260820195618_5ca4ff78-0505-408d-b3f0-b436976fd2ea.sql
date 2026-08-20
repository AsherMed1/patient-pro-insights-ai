ALTER TABLE public.all_appointments
  DROP CONSTRAINT IF EXISTS all_appointments_review_stage_check;

ALTER TABLE public.all_appointments
  ADD CONSTRAINT all_appointments_review_stage_check
  CHECK (review_stage IN ('new', 'pending_review', 'qa_hold', 'trainee', 'returned'));