-- Add parsed_medical_info column to all_appointments table
ALTER TABLE all_appointments 
ADD COLUMN IF NOT EXISTS parsed_medical_info JSONB;