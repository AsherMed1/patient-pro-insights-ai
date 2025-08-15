-- Fix HIPAA audit trigger to avoid jsonb - jsonb operator
CREATE OR REPLACE FUNCTION public.trigger_hipaa_audit_appointments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Log PHI access for appointments
  IF TG_OP = 'UPDATE' THEN
    PERFORM public.log_hipaa_audit(
      'appointment_update',
      'appointment', 
      NEW.id,
      'update',
      true,
      NEW.lead_name,
      jsonb_build_object(
        'old_values', to_jsonb(OLD),
        'new_values', to_jsonb(NEW),
        'updated_fields', array(
          SELECT key FROM jsonb_each(to_jsonb(NEW)) 
          WHERE value IS DISTINCT FROM (to_jsonb(OLD) -> key)
        )
      )
    );
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.log_hipaa_audit(
      'appointment_create',
      'appointment',
      NEW.id,
      'create', 
      true,
      NEW.lead_name,
      to_jsonb(NEW)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;