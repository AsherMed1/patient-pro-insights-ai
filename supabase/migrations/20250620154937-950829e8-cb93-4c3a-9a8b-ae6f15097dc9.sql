
-- Fix the verify_portal_session function to have an immutable search_path
DROP FUNCTION IF EXISTS public.verify_portal_session(text, text, inet);

CREATE OR REPLACE FUNCTION public.verify_portal_session(
  project_name_param text, 
  session_token_param text, 
  ip_address_param inet DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_valid boolean := false;
BEGIN
  -- Validate session with enhanced security checks
  SELECT EXISTS (
    SELECT 1 FROM public.project_portal_sessions
    WHERE project_name = project_name_param
      AND session_token = session_token_param
      AND expires_at > now()
      AND (ip_address IS NULL OR ip_address = ip_address_param)
  ) INTO session_valid;
  
  -- Log suspicious activity if session exists but IP doesn't match
  IF NOT session_valid AND EXISTS (
    SELECT 1 FROM public.project_portal_sessions
    WHERE project_name = project_name_param
      AND session_token = session_token_param
      AND expires_at > now()
      AND ip_address != ip_address_param
  ) THEN
    INSERT INTO public.security_audit_log (event_type, ip_address, details)
    VALUES ('session_ip_mismatch', ip_address_param, 
            jsonb_build_object('project', project_name_param));
  END IF;
  
  RETURN session_valid;
END;
$$;
