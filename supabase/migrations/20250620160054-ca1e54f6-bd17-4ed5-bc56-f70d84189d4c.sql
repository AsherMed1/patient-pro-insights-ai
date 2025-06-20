
-- Fix the create_portal_session function to have an immutable search_path
DROP FUNCTION IF EXISTS public.create_portal_session(text, text, inet, text);

CREATE OR REPLACE FUNCTION public.create_portal_session(
  project_name_param text,
  password_param text,
  ip_address_param inet DEFAULT NULL,
  user_agent_param text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  project_record RECORD;
  session_token TEXT;
  session_expires TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Verify project and password
  SELECT * INTO project_record
  FROM public.projects
  WHERE project_name = project_name_param;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Check password using bcrypt verification
  IF project_record.portal_password IS NOT NULL THEN
    IF NOT public.verify_password(password_param, project_record.portal_password) THEN
      RETURN NULL;
    END IF;
  END IF;
  
  -- Generate secure session token
  session_token := encode(gen_random_bytes(32), 'base64');
  session_expires := now() + INTERVAL '24 hours';
  
  -- Clean up expired sessions
  DELETE FROM public.project_portal_sessions 
  WHERE expires_at < now();
  
  -- Create new session
  INSERT INTO public.project_portal_sessions 
  (project_name, session_token, expires_at, ip_address, user_agent)
  VALUES 
  (project_name_param, session_token, session_expires, ip_address_param, user_agent_param);
  
  RETURN session_token;
END;
$$;
