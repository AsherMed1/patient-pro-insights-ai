-- Add missing insurance_id_link for Luis De Leon in Davis Vein & Vascular
UPDATE all_appointments 
SET 
  insurance_id_link = 'https://services.leadconnectorhq.com/documents/download/clTdyLbx9vqw5S6Aqpr7',
  updated_at = now()
WHERE id = 'e8532166-e214-4793-982c-ccd5c80257ab'
AND project_name = 'Davis Vein & Vascular';