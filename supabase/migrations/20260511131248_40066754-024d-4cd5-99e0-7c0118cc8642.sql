UPDATE all_appointments
SET parsing_completed_at = NULL,
    updated_at = now()
WHERE project_name ILIKE '%ventra%'
  AND COALESCE(parsed_pathology_info->>'procedure_type', '') NOT IN ('UFE', 'HAE');