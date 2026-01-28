-- Add procedure_status column to support 4 states instead of boolean
ALTER TABLE all_appointments 
ADD COLUMN IF NOT EXISTS procedure_status TEXT DEFAULT NULL;

-- Migrate existing data from procedure_ordered boolean to procedure_status text
UPDATE all_appointments 
SET procedure_status = CASE 
  WHEN procedure_ordered = true THEN 'ordered'
  WHEN procedure_ordered = false THEN 'no_procedure'
  ELSE NULL
END
WHERE procedure_status IS NULL;