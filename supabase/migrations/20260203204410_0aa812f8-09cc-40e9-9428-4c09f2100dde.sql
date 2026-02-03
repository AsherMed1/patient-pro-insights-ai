-- Add reserved_end_time column for storing end time of reserved time blocks
ALTER TABLE all_appointments 
ADD COLUMN reserved_end_time TIME;

-- Backfill existing reserved blocks by parsing end time from patient_intake_notes
UPDATE all_appointments 
SET reserved_end_time = (
  regexp_match(patient_intake_notes, 'Time: \d{2}:\d{2} - (\d{2}:\d{2})')
)[1]::time
WHERE is_reserved_block = true 
AND reserved_end_time IS NULL
AND patient_intake_notes IS NOT NULL;