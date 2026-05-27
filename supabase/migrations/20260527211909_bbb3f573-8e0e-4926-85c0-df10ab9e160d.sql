UPDATE public.all_appointments
SET date_of_appointment = NULL,
    requested_time = NULL,
    ghl_appointment_id = NULL,
    is_unscheduled = true,
    updated_at = now()
WHERE id = '60da9f6d-ab63-47fe-b7c0-af8c18fe1d1d';