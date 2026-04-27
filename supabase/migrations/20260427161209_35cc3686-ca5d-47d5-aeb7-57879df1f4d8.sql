UPDATE public.all_appointments
SET parsing_completed_at = NULL
WHERE date_appointment_created >= '2026-04-24'
  AND parsed_insurance_info IS NOT NULL
  AND parsed_insurance_info->>'insurance_group_number' IS NOT NULL
  AND detected_insurance_id = parsed_insurance_info->>'insurance_group_number';