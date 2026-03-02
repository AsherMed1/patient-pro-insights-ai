
-- Step 1: Move 6 appointments from "Naadi Healthcare" to "Naadi Healthcare Manteca"
UPDATE all_appointments SET project_name = 'Naadi Healthcare Manteca', updated_at = now()
WHERE project_name = 'Naadi Healthcare';

-- Step 2: Delete the orphan project "Naadi Healthcare"
DELETE FROM projects WHERE id = '189ad370-5cc1-4c78-a5fd-06db985c3967';

-- Step 3: Rename "Naadi Healthcare Manteca" → "Naadi Healthcare"
UPDATE projects SET project_name = 'Naadi Healthcare', updated_at = now()
WHERE id = '347a60ba-ea98-4180-9ee8-ea8fa5bd187f';

UPDATE all_appointments SET project_name = 'Naadi Healthcare', updated_at = now()
WHERE project_name = 'Naadi Healthcare Manteca';

UPDATE new_leads SET project_name = 'Naadi Healthcare'
WHERE project_name = 'Naadi Healthcare Manteca';

UPDATE all_calls SET project_name = 'Naadi Healthcare'
WHERE project_name = 'Naadi Healthcare Manteca';
