-- Remove duplicate appointments from all_appointments table
-- Keep only the oldest record (minimum id) for each unique combination

WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        project_name, 
        lead_name, 
        COALESCE(date_appointment_created::text, ''), 
        COALESCE(date_of_appointment::text, '')
      ORDER BY id ASC
    ) as row_num
  FROM all_appointments
  WHERE project_name IN ('Premier Vascular', 'Premier Vascular ')
)
DELETE FROM all_appointments
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE row_num > 1
);