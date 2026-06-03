UPDATE public.all_appointments
SET status = 'Confirmed',
    review_status = 'pending',
    reviewed_at = NULL,
    reviewed_by = NULL,
    internal_process_complete = false,
    was_ever_confirmed = true,
    updated_at = now()
WHERE id = 'd601acec-26b9-41ac-89db-6fe77d92dc3a';