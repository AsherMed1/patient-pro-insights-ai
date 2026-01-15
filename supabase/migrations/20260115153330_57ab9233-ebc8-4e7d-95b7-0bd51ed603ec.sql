-- Add column to control Overview tab visibility per user per project
ALTER TABLE project_user_access 
ADD COLUMN can_view_overview BOOLEAN DEFAULT true;

-- For Buffalo Vascular Care, disable Overview for all existing project users
UPDATE project_user_access 
SET can_view_overview = false
WHERE project_id = (
  SELECT id FROM projects WHERE project_name = 'Buffalo Vascular Care'
);