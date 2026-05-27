UPDATE public.all_appointments
SET parsing_completed_at = NULL,
    parsed_insurance_info = NULL,
    parsed_medical_info = NULL,
    parsed_pathology_info = NULL,
    parsed_contact_info = NULL,
    parsed_demographics = NULL,
    updated_at = now()
WHERE id = '1deec937-371a-409b-9da2-8593cb9e3b4a';