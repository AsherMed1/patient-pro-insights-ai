-- Fix security warnings from linter - handle trigger dependencies properly

-- Drop the trigger first, then the function
DROP TRIGGER IF EXISTS hipaa_audit_appointments_trigger ON public.all_appointments;
DROP FUNCTION IF EXISTS trigger_hipaa_audit_appointments();

-- Drop and recreate other functions with proper search_path
DROP FUNCTION IF EXISTS log_hipaa_audit(text, text, uuid, text, boolean, text, jsonb);
DROP FUNCTION IF EXISTS log_patient_access(text, text, text, text[], text);
DROP FUNCTION IF EXISTS cleanup_expired_sessions();

-- Recreate functions with proper search_path settings
CREATE OR REPLACE FUNCTION log_hipaa_audit(
  p_event_type text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_action text DEFAULT 'view',
  p_phi_accessed boolean DEFAULT true,
  p_patient_identifier text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  audit_id uuid;
BEGIN
  INSERT INTO public.hipaa_audit_log (
    user_id,
    event_type,
    resource_type,
    resource_id,
    action,
    phi_accessed,
    patient_identifier,
    metadata
  ) VALUES (
    auth.uid(),
    p_event_type,
    p_resource_type,
    p_resource_id,
    p_action,
    p_phi_accessed,
    p_patient_identifier,
    COALESCE(p_metadata, jsonb_build_object('timestamp', now()))
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

CREATE OR REPLACE FUNCTION log_patient_access(
  p_patient_identifier text,
  p_project_name text,
  p_access_type text,
  p_data_elements text[] DEFAULT ARRAY[]::text[],
  p_purpose text DEFAULT 'routine_care'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  access_id uuid;
BEGIN
  INSERT INTO public.patient_data_access (
    user_id,
    patient_identifier,
    project_name,
    access_type,
    data_elements,
    purpose
  ) VALUES (
    auth.uid(),
    p_patient_identifier,
    p_project_name,
    p_access_type,
    p_data_elements,
    p_purpose
  ) RETURNING id INTO access_id;
  
  RETURN access_id;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  cleaned_count integer;
BEGIN
  UPDATE public.user_sessions 
  SET is_active = false, terminated_reason = 'expired'
  WHERE expires_at < now() AND is_active = true;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN cleaned_count;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_hipaa_audit_appointments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
      jsonb_build_object('changes', to_jsonb(NEW) - to_jsonb(OLD))
    );
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.log_hipaa_audit(
      'appointment_create',
      'appointment',
      NEW.id,
      'create', 
      true,
      NEW.lead_name
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate the trigger
CREATE TRIGGER hipaa_audit_appointments_trigger
  AFTER INSERT OR UPDATE ON public.all_appointments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_hipaa_audit_appointments();

-- Log the security fixes
INSERT INTO public.security_audit_log (event_type, details)
VALUES ('security_linter_fixes', jsonb_build_object(
  'severity', 'INFO',
  'action', 'Fixed security linter warnings',
  'fixes', ARRAY[
    'Set search_path for HIPAA audit functions',
    'Hardened function security settings',
    'Applied proper schema prefixing'
  ],
  'remaining_warnings', 'OTP expiry requires manual configuration in auth settings',
  'timestamp', now()
));