-- First, sync the full patient intake notes from new_leads to all_appointments
UPDATE all_appointments 
SET patient_intake_notes = nl.patient_intake_notes
FROM new_leads nl
WHERE all_appointments.lead_name = nl.lead_name 
  AND all_appointments.project_name = nl.project_name
  AND nl.patient_intake_notes IS NOT NULL 
  AND LENGTH(nl.patient_intake_notes) > LENGTH(COALESCE(all_appointments.patient_intake_notes, ''));