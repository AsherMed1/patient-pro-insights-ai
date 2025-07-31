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