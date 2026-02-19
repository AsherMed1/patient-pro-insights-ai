
-- Update trigger to reset internal_process_complete when status goes back to confirmed/pending
CREATE OR REPLACE FUNCTION public.handle_appointment_status_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS NOT NULL THEN
    -- Reset internal_process_complete when status reverts to non-terminal
    IF LOWER(TRIM(NEW.status)) IN ('confirmed', 'pending') THEN
      NEW.internal_process_complete := false;
      NEW.updated_at := now();
    END IF;

    IF LOWER(TRIM(NEW.status)) IN ('no show', 'cancelled', 'canceled', 'showed', 'oon', 'do not call', 'donotcall') THEN
      IF LOWER(TRIM(NEW.status)) IN ('no show', 'cancelled', 'canceled', 'oon', 'do not call', 'donotcall') THEN
        NEW.procedure_ordered := false;
      END IF;
      
      NEW.internal_process_complete := true;
      NEW.updated_at := now();
      
      INSERT INTO public.security_audit_log (event_type, details)
      VALUES ('appointment_auto_completed', jsonb_build_object(
        'appointment_id', NEW.id,
        'lead_name', NEW.lead_name,
        'project_name', NEW.project_name,
        'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        'new_status', NEW.status,
        'procedure_ordered_updated', LOWER(TRIM(NEW.status)) IN ('no show', 'cancelled', 'canceled', 'oon', 'do not call', 'donotcall'),
        'internal_process_complete_set', true,
        'trigger_operation', TG_OP
      ));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix Ricky Blanton's record directly
UPDATE all_appointments 
SET internal_process_complete = false 
WHERE id = '9d53bfc3-a18f-4381-b2af-ee78c9b5d944';
