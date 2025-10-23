-- Add ghl_location_id column to projects table
ALTER TABLE projects
ADD COLUMN ghl_location_id TEXT;

COMMENT ON COLUMN projects.ghl_location_id IS 'HighLevel location ID for deep linking to contacts';