UPDATE public.all_appointments
SET review_status = 'approved', reviewed_at = COALESCE(reviewed_at, now()), review_notes = COALESCE(review_notes, 'Auto-approved: project exempt from review queue (time-preference intake)')
WHERE review_status = 'pending'
  AND project_name IN ('ECCO Medical', 'Premier Vascular', 'Premier Vascular Surgery');