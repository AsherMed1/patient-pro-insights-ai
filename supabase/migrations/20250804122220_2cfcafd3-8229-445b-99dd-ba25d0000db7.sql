-- Create a trigger function to auto-update appointments for no show/cancelled status
CREATE OR REPLACE FUNCTION public.handle_appointment_status_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status changed to 'no show' or 'cancelled' (case insensitive)
  IF NEW.status IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
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
        'old_status', OLD.status,
        'new_status', NEW.status,
        'procedure_ordered_set_to_false', true,
        'auto_completion_trigger', true
      ));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on all_appointments table
DROP TRIGGER IF EXISTS trigger_appointment_status_completion ON public.all_appointments;
CREATE TRIGGER trigger_appointment_status_completion
  BEFORE UPDATE ON public.all_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_appointment_status_completion();