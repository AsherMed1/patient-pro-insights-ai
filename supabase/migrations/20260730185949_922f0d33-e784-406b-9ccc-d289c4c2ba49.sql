UPDATE all_appointments SET parsing_completed_at = NULL
WHERE is_superseded IS NOT TRUE
  AND coalesce(patient_intake_notes,'') <> ''
  AND length(patient_intake_notes) > 200
  AND parsing_completed_at IS NOT NULL
  AND coalesce(parse_attempts,0) < 5
  AND (
    (parsed_insurance_info::text ~ '\*\*' OR parsed_medical_info::text ~ '\*\*' OR parsed_pathology_info::text ~ '\*\*')
    OR (
      (parsed_insurance_info IS NULL OR (SELECT count(*) FROM jsonb_each_text(parsed_insurance_info) e WHERE e.value <> '') = 0)
      AND (parsed_medical_info IS NULL OR (SELECT count(*) FROM jsonb_each_text(parsed_medical_info) e WHERE e.value <> '') = 0)
    )
  )