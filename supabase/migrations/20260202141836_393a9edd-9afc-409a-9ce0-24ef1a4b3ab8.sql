-- Consolidate Ally Vascular appointments to the active project (double-space)
UPDATE all_appointments
SET project_name = 'Ally Vascular  and Pain Centers',
    updated_at = NOW()
WHERE project_name = 'Ally Vascular and Pain Centers';

-- Consolidate leads to the active project (double-space)  
UPDATE new_leads
SET project_name = 'Ally Vascular  and Pain Centers',
    updated_at = NOW()
WHERE project_name = 'Ally Vascular and Pain Centers';

-- Delete the duplicate project entry (single-space)
DELETE FROM projects
WHERE project_name = 'Ally Vascular and Pain Centers';