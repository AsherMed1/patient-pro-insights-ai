-- Update trigger to include 'welcome call' as a terminal status
CREATE OR REPLACE FUNCTION public.handle_appointment_status_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS NOT NULL THEN
    IF LOWER(TRIM(NEW.status)) IN ('confirmed', 'pending') THEN
      NEW.internal_process_complete := false;
      NEW.procedure_ordered := NULL;
      NEW.procedure_status := NULL;
      NEW.updated_at := now();
    END IF;

    IF LOWER(TRIM(NEW.status)) IN ('no show', 'cancelled', 'canceled', 'showed', 'oon', 'do not call', 'donotcall', 'welcome call') THEN
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

-- Backfill: set internal_process_complete for all existing Welcome Call appointments
UPDATE all_appointments 
SET internal_process_complete = true, updated_at = now()
WHERE LOWER(TRIM(status)) = 'welcome call' 
  AND (internal_process_complete = false OR internal_process_complete IS NULL);