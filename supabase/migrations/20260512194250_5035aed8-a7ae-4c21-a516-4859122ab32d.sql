-- Reset parsing for appointments corrupted by the GHL "Patient Intake Summary"
-- single-line blob (parser used to slurp every subsequent label into Duration,
-- Symptoms, and Insurance fields). Clearing parsing_completed_at re-queues them
-- for the auto-parser, which now strips the blob before fallback regex parsing.
UPDATE public.all_appointments
SET
  parsing_completed_at = NULL,
  parsed_pathology_info = parsed_pathology_info
    - 'duration' - 'symptoms' - 'previous_treatments',
  parsed_insurance_info = parsed_insurance_info
    - 'insurance_provider' - 'insurance_plan' - 'insurance_group_number'
WHERE patient_intake_notes ILIKE '%Patient Intake Summary:%'
  AND (
    parsed_pathology_info->>'duration' ILIKE '%OA Diagnosis%'
    OR parsed_pathology_info->>'duration' ILIKE '%PFE Info%'
    OR parsed_pathology_info->>'duration' ILIKE '%UFE Info%'
    OR parsed_pathology_info->>'duration' ILIKE '%PAE Info%'
    OR parsed_pathology_info->>'symptoms' ILIKE '%PFE Info%'
    OR parsed_pathology_info->>'symptoms' ILIKE '%UFE Info%'
    OR parsed_pathology_info->>'symptoms' ILIKE '%PAE Info%'
    OR parsed_pathology_info->>'symptoms' ILIKE '%Constipation:   Intercourse%'
    OR parsed_insurance_info->>'insurance_provider' ILIKE '%Insurance Phone%'
    OR parsed_insurance_info->>'insurance_provider' ILIKE '%Group Number%'
  );