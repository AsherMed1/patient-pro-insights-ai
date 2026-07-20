
-- Fix Sarella Kately: promote her approved Davis row to scheduled with real GHL date/time,
-- and supersede the two duplicate unscheduled rows (backfill duplicate + old unknown).
UPDATE public.all_appointments
SET date_of_appointment = '2026-08-04',
    requested_time = '02:00 PM',
    is_unscheduled = false,
    time_preference = NULL,
    ghl_appointment_id = 'pRgKRO0EdCHFvTPVFenj',
    calendar_name = 'Sarella Kately GAE Consultation at Kingwood, TX',
    updated_at = now()
WHERE id = '2e4d14c1-d865-4806-af5e-9ff375cfe34f';

UPDATE public.all_appointments
SET is_superseded = true, updated_at = now()
WHERE id IN ('a3927065-5a93-4d46-b41d-ea25be127feb','6e9f31bf-60f0-454c-aa05-0447fa43092c');
