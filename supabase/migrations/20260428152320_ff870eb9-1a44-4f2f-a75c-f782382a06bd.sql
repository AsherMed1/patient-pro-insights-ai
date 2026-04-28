-- Strip leaked AI bot prompt instructions from parsed_pathology_info.symptoms
-- Affects ~128 appointments across 23 projects where GHL custom-field bot
-- instructions were captured into patient intake notes and parsed as symptoms.
UPDATE public.all_appointments
SET parsed_pathology_info = parsed_pathology_info - 'symptoms' || jsonb_build_object('symptoms', NULL),
    updated_at = now()
WHERE parsed_pathology_info IS NOT NULL
  AND parsed_pathology_info ? 'symptoms'
  AND parsed_pathology_info->>'symptoms' IS NOT NULL
  AND (
    parsed_pathology_info->>'symptoms' ILIKE '%Reference this data%'
    OR parsed_pathology_info->>'symptoms' ILIKE '%Booking Rule%'
    OR parsed_pathology_info->>'symptoms' ILIKE '%Booking Step%'
    OR parsed_pathology_info->>'symptoms' ILIKE '%Challenger Sale%'
    OR parsed_pathology_info->>'symptoms' ILIKE '%Natural Language Suggestions%'
    OR parsed_pathology_info->>'symptoms' ILIKE '%Booking Steps:%'
    OR parsed_pathology_info->>'symptoms' ILIKE '%Preferred Times:%'
    OR LENGTH(parsed_pathology_info->>'symptoms') > 400
  );