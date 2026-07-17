UPDATE public.all_appointments
SET parsing_completed_at = NULL
WHERE project_name = 'Georgia Endovascular'
  AND (
    UPPER(parsed_pathology_info->>'procedure_type') = 'PFE'
    OR calendar_name ILIKE '%PFE%'
    OR calendar_name ILIKE '%Plantar%'
  );