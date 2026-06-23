CREATE OR REPLACE FUNCTION public.handle_unscheduled_time_preference_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  unscheduled_projects text[] := ARRAY[
    'Davis Vein & Vascular',
    'ECCO Medical',
    'Premier Vascular',
    'Premier Vascular Surgery'
  ];
  history_entry jsonb;
BEGIN
  IF COALESCE(OLD.is_unscheduled, false) = true
     AND NEW.time_preference IS DISTINCT FROM OLD.time_preference
     AND NEW.project_name = ANY(unscheduled_projects)
  THEN
    NEW.status := 'Pending';
    NEW.internal_process_complete := false;
    NEW.procedure_ordered := NULL;
    NEW.procedure_status := NULL;
    NEW.updated_at := now();

    history_entry := jsonb_build_object(
      'at', now(),
      'type', 'time_preference_change',
      'old_time_preference', OLD.time_preference,
      'new_time_preference', NEW.time_preference,
      'by', COALESCE(auth.uid()::text, 'system')
    );

    NEW.reschedule_history := COALESCE(NEW.reschedule_history, '[]'::jsonb) || history_entry;

    INSERT INTO public.security_audit_log (event_type, details)
    VALUES (
      'unscheduled_time_preference_reset',
      jsonb_build_object(
        'appointment_id', NEW.id,
        'lead_name', NEW.lead_name,
        'project_name', NEW.project_name,
        'old_time_preference', OLD.time_preference,
        'new_time_preference', NEW.time_preference
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_handle_unscheduled_time_preference_change ON public.all_appointments;

CREATE TRIGGER trg_handle_unscheduled_time_preference_change
BEFORE UPDATE ON public.all_appointments
FOR EACH ROW
EXECUTE FUNCTION public.handle_unscheduled_time_preference_change();