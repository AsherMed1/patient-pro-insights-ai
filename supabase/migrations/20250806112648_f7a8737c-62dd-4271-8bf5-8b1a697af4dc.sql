-- Update the trigger function to only set parsing fields on tables where they exist
CREATE OR REPLACE FUNCTION public.trigger_auto_ai_parsing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger if patient_intake_notes changed and is not empty
  IF (TG_OP = 'INSERT' AND NEW.patient_intake_notes IS NOT NULL AND NEW.patient_intake_notes != '') 
     OR (TG_OP = 'UPDATE' AND NEW.patient_intake_notes IS DISTINCT FROM OLD.patient_intake_notes 
         AND NEW.patient_intake_notes IS NOT NULL AND NEW.patient_intake_notes != '') THEN
    
    -- Only reset parsing fields if they exist in the current table (all_appointments)
    -- The new_leads table doesn't have these fields anymore
    IF TG_TABLE_NAME = 'all_appointments' THEN
      -- Reset parsing fields to indicate new parsing is needed
      NEW.parsed_insurance_info := NULL;
      NEW.parsed_pathology_info := NULL;
      NEW.parsed_contact_info := NULL;
      NEW.parsed_demographics := NULL;
      NEW.parsing_completed_at := NULL;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$function$;