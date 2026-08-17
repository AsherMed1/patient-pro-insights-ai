-- James Hendrix: live GHL appointment 2026-08-21 13:45 (Hayward, CA)
UPDATE public.all_appointments
SET date_of_appointment = '2026-08-21',
    requested_time = '13:45:00',
    ghl_appointment_id = '4SG4Q3zDRj6hc6a9QV3A',
    is_unscheduled = false,
    time_preference = NULL
WHERE id = '4b42aa7f-09a0-49ad-a4dc-f3d104b0ecd8'
  AND date_of_appointment IS NULL;

-- Sean Eldridge: live GHL appointment 2026-08-31 14:00 (Hayward, CA)
UPDATE public.all_appointments
SET date_of_appointment = '2026-08-31',
    requested_time = '14:00:00',
    ghl_appointment_id = 'LDV79OscFpfol4GcEDbC',
    is_unscheduled = false,
    time_preference = NULL
WHERE id = '6312f2a0-1041-4ccb-bf89-458f0569d486'
  AND date_of_appointment IS NULL;