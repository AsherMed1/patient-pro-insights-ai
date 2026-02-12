CREATE OR REPLACE FUNCTION public.handle_appointment_status_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS NOT NULL THEN
    IF LOWER(TRIM(NEW.status)) IN ('no show', 'cancelled', 'canceled', 'showed', 'oon', 'do not call', 'donotcall') THEN
      -- Set procedure_ordered to false for no show/cancelled/oon/do not call
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
$$ LANGUAGE plpgsql SET search_path = public;