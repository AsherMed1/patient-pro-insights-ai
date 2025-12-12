-- Fix double-space typo in Hollywood calendar names for Vivid Vascular
UPDATE all_appointments 
SET calendar_name = REPLACE(calendar_name, 'at  Hollywood', 'at Hollywood'),
    updated_at = now()
WHERE project_name = 'Vivid Vascular' 
AND calendar_name LIKE '%at  Hollywood%';