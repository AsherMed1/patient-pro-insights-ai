-- Reset parsing_completed_at for Arterial Interventional Centers appointments to trigger re-parsing
UPDATE all_appointments 
SET parsing_completed_at = NULL
WHERE project_name = 'Arterial Interventional Centers'
AND patient_intake_notes IS NOT NULL
AND patient_intake_notes ILIKE '%urologist%';