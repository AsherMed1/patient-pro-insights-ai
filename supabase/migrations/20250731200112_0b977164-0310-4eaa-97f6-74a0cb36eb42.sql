-- Create a function to manually sync all existing appointments with missing patient intake notes
CREATE OR REPLACE FUNCTION public.bulk_sync_patient_intake_notes()
RETURNS TABLE(
  appointment_id uuid,
  lead_name text,
  project_name text,
  notes_synced boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH synced_appointments AS (
    UPDATE public.all_appointments a
    SET 
      patient_intake_notes = l.patient_intake_notes,
      updated_at = now()
    FROM public.new_leads l
    WHERE LOWER(TRIM(a.lead_name)) = LOWER(TRIM(l.lead_name))
      AND a.project_name = l.project_name
      AND (a.patient_intake_notes IS NULL OR a.patient_intake_notes = '')
      AND l.patient_intake_notes IS NOT NULL
      AND l.patient_intake_notes != ''
    RETURNING a.id, a.lead_name, a.project_name
  )
  SELECT 
    sa.id as appointment_id,
    sa.lead_name,
    sa.project_name,
    true as notes_synced
  FROM synced_appointments sa;
END;
$function$