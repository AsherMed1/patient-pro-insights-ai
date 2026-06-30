ALTER TABLE public.all_appointments
  DROP CONSTRAINT IF EXISTS all_appointments_review_status_check;

ALTER TABLE public.all_appointments
  ADD CONSTRAINT all_appointments_review_status_check
  CHECK (review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'declined'::text, 'oon'::text, 'dismissed'::text]));