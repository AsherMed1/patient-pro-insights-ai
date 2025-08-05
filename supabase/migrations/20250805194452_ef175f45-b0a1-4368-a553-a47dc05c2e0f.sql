-- Update the specific Susan Scott Braxton appointment to set procedure_ordered = false
UPDATE public.all_appointments 
SET procedure_ordered = false, updated_at = now()
WHERE ghl_appointment_id = 'NDYhWxDv8ItzkigC7GSO';

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS trigger_appointment_status_completion ON public.all_appointments;

-- Update the trigger function to handle both INSERT and UPDATE operations
CREATE OR REPLACE FUNCTION public.handle_appointment_status_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if status is 'no show' or 'cancelled' (case insensitive)
  IF NEW.status IS NOT NULL THEN
    IF LOWER(TRIM(NEW.status)) IN ('no show', 'cancelled', 'canceled') THEN
      -- Set procedure_ordered to false and mark as completed
      NEW.procedure_ordered := false;
      NEW.status := CASE 
        WHEN LOWER(TRIM(NEW.status)) = 'no show' THEN 'No Show - Completed'
        WHEN LOWER(TRIM(NEW.status)) IN ('cancelled', 'canceled') THEN 'Cancelled - Completed'
        ELSE NEW.status
      END;
      NEW.updated_at := now();
      
      -- Log the automatic completion
      INSERT INTO public.security_audit_log (event_type, details)
      VALUES ('appointment_auto_completed', jsonb_build_object(
        'appointment_id', NEW.id,
        'lead_name', NEW.lead_name,
        'project_name', NEW.project_name,
        'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        'new_status', NEW.status,
        'procedure_ordered_set_to_false', true,
        'auto_completion_trigger', true,
        'trigger_operation', TG_OP
      ));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the new trigger for both INSERT and UPDATE operations
CREATE TRIGGER trigger_appointment_status_completion
  BEFORE INSERT OR UPDATE ON public.all_appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_appointment_status_completion();