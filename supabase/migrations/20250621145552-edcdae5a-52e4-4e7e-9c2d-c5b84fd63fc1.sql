
-- Create user roles system first
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Policies for user_roles table
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Now apply the security infrastructure fixes
-- Add user_id columns to tables that need user-specific access
ALTER TABLE public.form_submissions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Create rate limiting table for edge functions
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(identifier, endpoint, window_start)
);

-- Enable RLS on new table
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access only (for edge functions)
CREATE POLICY "Service role access to rate limits" ON public.api_rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create security headers configuration table
CREATE TABLE IF NOT EXISTS public.security_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default security configuration
INSERT INTO public.security_config (config_key, config_value) VALUES
('csp_policy', '{"default-src": ["''self''"], "script-src": ["''self''", "''unsafe-inline''"], "style-src": ["''self''", "''unsafe-inline''"]}'),
('rate_limits', '{"default": 100, "auth": 10, "form_submission": 5}'),
('session_timeout', '{"warning_minutes": 5, "max_idle_minutes": 30}')
ON CONFLICT (config_key) DO NOTHING;

-- Enable RLS on security config
ALTER TABLE public.security_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read security config
CREATE POLICY "Authenticated users can read security config" ON public.security_config
  FOR SELECT TO authenticated USING (true);

-- Create enhanced security logging function
CREATE OR REPLACE FUNCTION public.log_security_event_v2(
  event_type_param TEXT,
  severity_param TEXT DEFAULT 'INFO',
  user_id_param UUID DEFAULT NULL,
  session_id_param TEXT DEFAULT NULL,
  ip_address_param INET DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL,
  details_param JSONB DEFAULT NULL,
  endpoint_param TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_audit_log (
    event_type, 
    user_id, 
    session_id,
    ip_address, 
    user_agent, 
    details
  ) VALUES (
    format('%s_%s', severity_param, event_type_param),
    COALESCE(user_id_param, auth.uid()),
    session_id_param,
    ip_address_param,
    user_agent_param,
    jsonb_build_object(
      'severity', severity_param,
      'timestamp', now(),
      'endpoint', endpoint_param,
      'details', details_param
    )
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Create rate limiting check function
CREATE OR REPLACE FUNCTION public.check_rate_limit_v2(
  identifier_param TEXT,
  endpoint_param TEXT,
  max_requests_param INTEGER DEFAULT 100,
  window_minutes_param INTEGER DEFAULT 1
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start_time := date_trunc('minute', now()) - ((EXTRACT(MINUTE FROM now())::INTEGER % window_minutes_param) || ' minutes')::INTERVAL;
  
  -- Get current count for this window
  SELECT COALESCE(request_count, 0) INTO current_count
  FROM public.api_rate_limits
  WHERE identifier = identifier_param
    AND endpoint = endpoint_param
    AND window_start = window_start_time;
  
  -- If limit exceeded, check if still blocked
  IF current_count >= max_requests_param THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  INSERT INTO public.api_rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (identifier_param, endpoint_param, 1, window_start_time)
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET 
    request_count = api_rate_limits.request_count + 1;
  
  -- Clean up old entries (older than 1 hour)
  DELETE FROM public.api_rate_limits 
  WHERE window_start < now() - INTERVAL '1 hour';
  
  RETURN TRUE;
END;
$$;

-- Update existing RLS policies to be more restrictive
-- Drop overly permissive policies and replace with user-specific ones
DROP POLICY IF EXISTS "Secure public submit forms" ON public.form_submissions;
DROP POLICY IF EXISTS "Secure authenticated read form submissions" ON public.form_submissions;

-- Allow public form submission but with rate limiting (handled in edge functions)
CREATE POLICY "Public form submission" ON public.form_submissions
  FOR INSERT TO anon, authenticated 
  WITH CHECK (true);

-- Only authenticated users can read their own submissions or admins can read all
CREATE POLICY "User form submissions access" ON public.form_submissions
  FOR SELECT TO authenticated 
  USING (
    user_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_identifier_endpoint ON public.api_rate_limits(identifier, endpoint, window_start);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON public.form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
