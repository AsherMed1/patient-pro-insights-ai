UPDATE public.all_appointments
SET parsed_medical_info = parsed_medical_info - 'smoking_status',
    parsing_completed_at = NULL
WHERE parsed_medical_info ? 'smoking_status'
  AND (
    COALESCE(parsed_pathology_info->>'procedure_type', '') <> 'PAD'
    OR parsed_medical_info->>'smoking_status' ~* '(state:|zip:|\|)'
  );