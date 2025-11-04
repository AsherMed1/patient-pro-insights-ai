-- Add GHL sync status tracking to all_appointments table
ALTER TABLE all_appointments 
ADD COLUMN IF NOT EXISTS last_ghl_sync_status TEXT CHECK (last_ghl_sync_status IN ('success', 'failed', 'pending')),
ADD COLUMN IF NOT EXISTS last_ghl_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_ghl_sync_error TEXT;

-- Create index for querying failed syncs
CREATE INDEX IF NOT EXISTS idx_all_appointments_ghl_sync_status 
ON all_appointments(last_ghl_sync_status) 
WHERE last_ghl_sync_status = 'failed';

-- Add comment explaining the columns
COMMENT ON COLUMN all_appointments.last_ghl_sync_status IS 'Status of last GoHighLevel sync attempt: success, failed, or pending';
COMMENT ON COLUMN all_appointments.last_ghl_sync_at IS 'Timestamp of last GoHighLevel sync attempt';
COMMENT ON COLUMN all_appointments.last_ghl_sync_error IS 'Error message if last sync failed';