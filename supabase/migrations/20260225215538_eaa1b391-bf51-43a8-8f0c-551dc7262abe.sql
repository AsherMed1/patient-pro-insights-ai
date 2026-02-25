-- Migrate orphaned calls to canonical project
UPDATE public.all_calls 
SET project_name = 'Naadi Healthcare Manteca' 
WHERE project_name = 'Naadi Healthcare';

-- Also migrate any appointments if they exist
UPDATE public.all_appointments 
SET project_name = 'Naadi Healthcare Manteca' 
WHERE project_name = 'Naadi Healthcare';

-- Also migrate any leads if they exist
UPDATE public.new_leads 
SET project_name = 'Naadi Healthcare Manteca' 
WHERE project_name = 'Naadi Healthcare';

-- Delete the duplicate project
DELETE FROM public.projects 
WHERE project_name = 'Naadi Healthcare';