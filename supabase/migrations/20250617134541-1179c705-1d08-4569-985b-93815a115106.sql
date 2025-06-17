
-- Add password field to projects table for portal protection
ALTER TABLE public.projects 
ADD COLUMN portal_password text;

-- Add comment to explain the field
COMMENT ON COLUMN public.projects.portal_password IS 'Password required to access the project portal. If null, no password is required.';
