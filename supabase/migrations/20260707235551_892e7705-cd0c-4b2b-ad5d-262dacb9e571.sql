UPDATE public.all_appointments
SET date_of_appointment = '2026-07-09',
    requested_time = '10:00:00',
    reschedule_history = COALESCE(
      (SELECT jsonb_agg(elem) FROM jsonb_array_elements(reschedule_history) elem
       WHERE NOT (elem->>'changed_at' = '2026-07-07T23:29:14.283Z')),
      '[]'::jsonb
    ),
    updated_at = now()
WHERE id = '0cd2c8e5-7d69-4db1-84e1-023162b5edb7';