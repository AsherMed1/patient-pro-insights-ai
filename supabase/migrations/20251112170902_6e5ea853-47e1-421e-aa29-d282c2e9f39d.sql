-- Add sync metadata columns to all_appointments for tracking Google Sheets sync
ALTER TABLE all_appointments 
ADD COLUMN IF NOT EXISTS last_sync_source text,
ADD COLUMN IF NOT EXISTS last_sync_timestamp timestamp with time zone;

-- Add index for faster sync queries
CREATE INDEX IF NOT EXISTS idx_all_appointments_sync_lookup 
ON all_appointments(project_name, date_of_appointment, lower(trim(lead_name)));

-- Add comment for documentation
COMMENT ON COLUMN all_appointments.last_sync_source IS 'Source of last sync: google_sheets, database, or manual';
COMMENT ON COLUMN all_appointments.last_sync_timestamp IS 'Timestamp of last successful sync operation';
