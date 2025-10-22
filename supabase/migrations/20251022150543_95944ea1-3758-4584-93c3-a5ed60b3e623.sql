-- Add webhook URL column to projects table
ALTER TABLE projects 
ADD COLUMN appointment_webhook_url TEXT;

COMMENT ON COLUMN projects.appointment_webhook_url IS 
'Webhook URL to notify when appointment status changes for this project';