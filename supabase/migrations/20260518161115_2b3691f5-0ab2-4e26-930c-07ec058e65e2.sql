-- Backfill parsed_pathology_info.location and procedure_type from intake notes
-- for appointments where calendar_name is 'Unknown' (ECCO Medical, Premier Vascular unscheduled leads).
-- Source: GHL custom fields "Location Picker" and "Service Name" in patient_intake_notes.

UPDATE public.all_appointments
SET parsed_pathology_info = COALESCE(parsed_pathology_info, '{}'::jsonb)
  || jsonb_strip_nulls(jsonb_build_object(
       'location', NULLIF(TRIM(substring(patient_intake_notes from 'Location Picker\s*:\s*([^\n]+)')), ''),
       'procedure_type', CASE
         WHEN (parsed_pathology_info->>'procedure_type') IS NULL OR (parsed_pathology_info->>'procedure_type') = ''
         THEN UPPER(NULLIF(TRIM(substring(patient_intake_notes from 'Service Name\s*:\s*(GAE|PFE|UFE|PAE|HAE|PAD|FSE|TAE)')), ''))
         ELSE parsed_pathology_info->>'procedure_type'
       END
     )),
    updated_at = now()
WHERE calendar_name = 'Unknown'
  AND patient_intake_notes IS NOT NULL
  AND (
    (parsed_pathology_info->>'location') IS NULL
    OR (parsed_pathology_info->>'procedure_type') IS NULL
  )
  AND (
    patient_intake_notes ~* 'Location Picker\s*:'
    OR patient_intake_notes ~* 'Service Name\s*:\s*(GAE|PFE|UFE|PAE|HAE|PAD|FSE|TAE)'
  );

-- PFE keyword fallback for rows where neither Service Name nor calendar provided one
UPDATE public.all_appointments
SET parsed_pathology_info = COALESCE(parsed_pathology_info, '{}'::jsonb)
  || jsonb_build_object('procedure_type', 'PFE'),
    updated_at = now()
WHERE calendar_name = 'Unknown'
  AND (parsed_pathology_info->>'procedure_type') IS NULL
  AND patient_intake_notes IS NOT NULL
  AND patient_intake_notes ~* '\m(plantar\s+fasciitis|plantar|heel\s+pain)\M';