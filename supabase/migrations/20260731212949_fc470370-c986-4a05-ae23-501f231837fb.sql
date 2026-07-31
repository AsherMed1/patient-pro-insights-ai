UPDATE public.all_appointments
SET parsed_pathology_info = COALESCE(parsed_pathology_info, '{}'::jsonb) || jsonb_build_object('procedure', 'GAE'),
    updated_at = now()
WHERE project_name = 'Horizon Vascular Specialists'
  AND calendar_name ILIKE '%GAE%'
  AND COALESCE(parsed_pathology_info->>'procedure', '') = '';