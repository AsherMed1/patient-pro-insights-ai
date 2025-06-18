
-- Add ghl_api_key column to the projects table
ALTER TABLE public.projects 
ADD COLUMN ghl_api_key TEXT;
