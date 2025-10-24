-- Phase 1: Add timezone support to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Chicago';

COMMENT ON COLUMN projects.timezone IS 'Timezone from GoHighLevel location, used for appointment scheduling';

-- Phase 2: Add GHL sync tracking to appointment_reschedules table
ALTER TABLE appointment_reschedules 
  ADD COLUMN IF NOT EXISTS ghl_sync_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ghl_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS ghl_synced_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN appointment_reschedules.ghl_sync_status IS 'Status of GHL API sync: pending, success, failed, skipped';
COMMENT ON COLUMN appointment_reschedules.ghl_sync_error IS 'Error message if GHL sync failed';

-- Create index for performance on failed syncs
CREATE INDEX IF NOT EXISTS idx_reschedules_sync_status ON appointment_reschedules(ghl_sync_status) WHERE ghl_sync_status = 'failed';