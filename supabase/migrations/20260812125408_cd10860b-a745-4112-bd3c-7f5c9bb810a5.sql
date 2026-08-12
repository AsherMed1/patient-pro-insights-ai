ALTER TABLE public.all_appointments
  ADD COLUMN IF NOT EXISTS pending_since timestamptz,
  ADD COLUMN IF NOT EXISTS pending_by uuid,
  ADD COLUMN IF NOT EXISTS pending_by_name text,
  ADD COLUMN IF NOT EXISTS short_notice_auto_tagged_at timestamptz;

UPDATE public.all_appointments a
SET pending_since = COALESCE(
  (SELECT h.created_at FROM public.appointment_review_history h
     WHERE h.appointment_id = a.id AND h.action IN ('review_stage_changed','moved_to_pending')
     ORDER BY h.created_at DESC LIMIT 1),
  a.created_at
)
WHERE a.review_status = 'pending' AND a.review_stage = 'pending_review' AND a.pending_since IS NULL;

CREATE INDEX IF NOT EXISTS idx_all_appointments_review_stage_pending
  ON public.all_appointments (review_stage, review_status)
  WHERE review_status = 'pending';