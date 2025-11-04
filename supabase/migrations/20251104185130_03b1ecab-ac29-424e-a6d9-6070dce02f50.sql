-- Add emr_link column to projects table for quick EMR access from processing queue
ALTER TABLE projects 
ADD COLUMN emr_link TEXT;

COMMENT ON COLUMN projects.emr_link IS 'URL link to the EMR system for quick access from the EMR processing queue';