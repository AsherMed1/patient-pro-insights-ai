-- Create a function to sync patient intake notes from leads to appointments
CREATE OR REPLACE FUNCTION public.sync_patient_intake_notes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When an appointment is inserted or updated, try to find matching lead and copy patient intake notes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.patient_intake_notes IS NULL) THEN
    -- Look for matching lead by name and project
    UPDATE public.all_appointments 
    SET patient_intake_notes = COALESCE(
      (SELECT patient_intake_notes 
       FROM public.new_leads 
       WHERE LOWER(TRIM(lead_name)) = LOWER(TRIM(NEW.lead_name))
         AND project_name = NEW.project_name
         AND patient_intake_notes IS NOT NULL
         AND patient_intake_notes != ''
       ORDER BY created_at DESC 
       LIMIT 1), 
      NEW.patient_intake_notes
    ),
    updated_at = now()
    WHERE id = NEW.id;
    
    -- Get the updated record
    SELECT * INTO NEW FROM public.all_appointments WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$

-- Create trigger to automatically sync patient intake notes for new appointments
DROP TRIGGER IF EXISTS sync_patient_intake_on_appointment ON public.all_appointments;
CREATE TRIGGER sync_patient_intake_on_appointment
  AFTER INSERT OR UPDATE ON public.all_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_patient_intake_notes();

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