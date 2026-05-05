UPDATE public.all_appointments
SET dob = NULL,
    parsed_demographics = COALESCE(parsed_demographics, '{}'::jsonb)
                          - 'dob' - 'age',
    parsing_completed_at = NULL,
    updated_at = now()
WHERE id = '9806c839-6d0b-4518-97b8-595d721e59c7';