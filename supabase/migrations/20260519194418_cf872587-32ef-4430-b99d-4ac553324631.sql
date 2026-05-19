UPDATE public.all_appointments
SET review_status = 'approved',
    reviewed_at = COALESCE(reviewed_at, now()),
    review_notes = COALESCE(review_notes, 'Auto-approved: exempt project')
WHERE review_status = 'pending'
  AND project_name IN ('ECCO Medical', 'Premier Vascular', 'Premier Vascular Surgery');