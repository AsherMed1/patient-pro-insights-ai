-- Update the trigger function to only set procedure_ordered = false, without modifying status
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
      -- Set procedure_ordered to false but keep original status
      NEW.procedure_ordered := false;
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
        'trigger_operation', TG_OP,
        'status_unchanged', true
      ));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;