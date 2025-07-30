-- Update the create_secure_portal_session function to use explicit schema for gen_random_bytes
CREATE OR REPLACE FUNCTION public.create_secure_portal_session(project_name_param text, password_param text, ip_address_param inet DEFAULT NULL::inet, user_agent_param text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  project_record RECORD;
  session_token TEXT;
  session_expires TIMESTAMP WITH TIME ZONE;
  rate_limit_count INTEGER;
BEGIN
  -- Rate limiting check (max 5 attempts per IP per 15 minutes)
  SELECT COUNT(*) INTO rate_limit_count
  FROM public.rate_limit_log
  WHERE identifier = COALESCE(ip_address_param::TEXT, 'unknown')
    AND action_type = 'portal_login_attempt'
    AND window_start > now() - INTERVAL '15 minutes';
    
  IF rate_limit_count >= 5 THEN
    -- Log security event
    INSERT INTO public.security_audit_log (event_type, ip_address, user_agent, details)
    VALUES ('rate_limit_exceeded', ip_address_param, user_agent_param, 
            jsonb_build_object('action', 'portal_login', 'project', project_name_param));
    RETURN NULL;
  END IF;
  
  -- Log login attempt
  INSERT INTO public.rate_limit_log (identifier, action_type)
  VALUES (COALESCE(ip_address_param::TEXT, 'unknown'), 'portal_login_attempt');
  
  -- Verify project exists and get password
  SELECT * INTO project_record
  FROM public.projects
  WHERE project_name = project_name_param AND active = true;
  
  IF NOT FOUND THEN
    -- Log security event
    INSERT INTO public.security_audit_log (event_type, ip_address, user_agent, details)
    VALUES ('invalid_project_access', ip_address_param, user_agent_param, 
            jsonb_build_object('project', project_name_param));
    RETURN NULL;
  END IF;
  
  -- Check password if required
  IF project_record.portal_password IS NOT NULL THEN
    IF NOT public.verify_password(password_param, project_record.portal_password) THEN
      -- Log failed authentication
      INSERT INTO public.security_audit_log (event_type, ip_address, user_agent, details)
      VALUES ('portal_auth_failed', ip_address_param, user_agent_param, 
              jsonb_build_object('project', project_name_param));
      RETURN NULL;
    END IF;
  END IF;
  
  -- Generate secure session token using extensions.gen_random_bytes
  session_token := encode(extensions.gen_random_bytes(32), 'base64');
  session_expires := now() + INTERVAL '8 hours';
  
  -- Clean up expired sessions
  DELETE FROM public.project_portal_sessions 
  WHERE expires_at < now();
  
  -- Create new session with IP validation
  INSERT INTO public.project_portal_sessions 
  (project_name, session_token, expires_at, ip_address, user_agent)
  VALUES 
  (project_name_param, session_token, session_expires, ip_address_param, user_agent_param);
  
  -- Log successful authentication
  INSERT INTO public.security_audit_log (event_type, ip_address, user_agent, details)
  VALUES ('portal_auth_success', ip_address_param, user_agent_param, 
          jsonb_build_object('project', project_name_param));
  
  RETURN session_token;
END;
$function$;