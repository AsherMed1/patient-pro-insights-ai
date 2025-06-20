
-- Fix the log_security_event function to have an immutable search_path
DROP FUNCTION IF EXISTS public.log_security_event(text, inet, text, jsonb);

CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type_param text,
  ip_address_param inet DEFAULT NULL,
  user_agent_param text DEFAULT NULL,
  details_param jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (event_type, ip_address, user_agent, details)
  VALUES (event_type_param, ip_address_param, user_agent_param, details_param);
END;
$$;
