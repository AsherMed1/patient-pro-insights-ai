ALTER TABLE public.all_appointments
  ADD COLUMN IF NOT EXISTS ghl_approved_tag_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_all_appointments_pending_approved_tag
  ON public.all_appointments (review_status, ghl_approved_tag_sent_at)
  WHERE review_status = 'approved' AND ghl_approved_tag_sent_at IS NULL;

UPDATE public.all_appointments
SET ghl_approved_tag_sent_at = now()
WHERE id IN (
  '8fdcce94-26b4-4c2e-8a82-b0f6b411b6c1',
  '60a20a43-793f-449a-94ee-de878e8c8090',
  '43a5ad21-e8a4-49c3-a560-fbc0381f6676'
);