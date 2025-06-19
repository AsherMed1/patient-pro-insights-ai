
-- Phase 1: Critical Security Fixes - Database Hardening and RLS Policy Cleanup

-- First, drop all conflicting and duplicate policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public access to all_calls" ON public.all_calls;
DROP POLICY IF EXISTS "Allow public access to all_appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Allow public access to new_leads" ON public.new_leads;
DROP POLICY IF EXISTS "Allow public access to form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Allow public access to projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public access to agents" ON public.agents;
DROP POLICY IF EXISTS "Allow public access to speed_to_lead_stats" ON public.speed_to_lead_stats;
DROP POLICY IF EXISTS "Allow public access to agent_performance_stats" ON public.agent_performance_stats;
DROP POLICY IF EXISTS "Allow public access to csv_import_history" ON public.csv_import_history;
DROP POLICY IF EXISTS "Allow public access to facebook_ad_spend" ON public.facebook_ad_spend;
DROP POLICY IF EXISTS "Allow public access to form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Allow public access to project_forms" ON public.project_forms;

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Secure calls view" ON public.all_calls;
DROP POLICY IF EXISTS "Secure calls insert" ON public.all_calls;
DROP POLICY IF EXISTS "Secure calls update" ON public.all_calls;
DROP POLICY IF EXISTS "Secure appointments view" ON public.all_appointments;
DROP POLICY IF EXISTS "Secure appointments insert" ON public.all_appointments;
DROP POLICY IF EXISTS "Secure appointments update" ON public.all_appointments;
DROP POLICY IF EXISTS "Secure projects view" ON public.projects;
DROP POLICY IF EXISTS "Secure projects insert" ON public.projects;
DROP POLICY IF EXISTS "Secure projects update" ON public.projects;
DROP POLICY IF EXISTS "Secure form submissions view" ON public.form_submissions;
DROP POLICY IF EXISTS "Secure form submissions insert" ON public.form_submissions;
DROP POLICY IF EXISTS "Secure leads view" ON public.new_leads;
DROP POLICY IF EXISTS "Secure leads insert" ON public.new_leads;
DROP POLICY IF EXISTS "Secure leads update" ON public.new_leads;
DROP POLICY IF EXISTS "Public can submit forms" ON public.form_submissions;
DROP POLICY IF EXISTS "Public can view form templates" ON public.form_templates;
DROP POLICY IF EXISTS "Public can view project forms" ON public.project_forms;

-- Enable RLS on all sensitive tables
ALTER TABLE public.all_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_to_lead_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_ad_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_portal_sessions ENABLE ROW LEVEL SECURITY;

-- Create strict authenticated-only policies for sensitive data
CREATE POLICY "Authenticated users only - all_calls" ON public.all_calls
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users only - all_appointments" ON public.all_appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users only - new_leads" ON public.new_leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users only - projects" ON public.projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users only - agents" ON public.agents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users only - speed_stats" ON public.speed_to_lead_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users only - agent_stats" ON public.agent_performance_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users only - import_history" ON public.csv_import_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users only - ad_spend" ON public.facebook_ad_spend
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Form submissions: Allow public insert but authenticated access for management
CREATE POLICY "Public form submission insert only" ON public.form_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Authenticated view form submissions" ON public.form_submissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated manage form submissions" ON public.form_submissions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated delete form submissions" ON public.form_submissions
  FOR DELETE TO authenticated USING (true);

-- Form templates: Public read for forms, authenticated management
CREATE POLICY "Public read form templates" ON public.form_templates
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated manage form templates" ON public.form_templates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update form templates" ON public.form_templates
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated delete form templates" ON public.form_templates
  FOR DELETE TO authenticated USING (true);

-- Project forms: Public read for forms, authenticated management
CREATE POLICY "Public read project forms" ON public.project_forms
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated manage project forms" ON public.project_forms
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update project forms" ON public.project_forms
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated delete project forms" ON public.project_forms
  FOR DELETE TO authenticated USING (true);

-- Portal sessions: System access only
CREATE POLICY "System only portal sessions" ON public.project_portal_sessions
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Create security audit table for monitoring
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read audit log" ON public.security_audit_log
  FOR SELECT TO authenticated USING (true);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP, user_id, etc.
  action_type TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System only rate limit log" ON public.rate_limit_log
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Enhanced portal session management with IP validation
CREATE OR REPLACE FUNCTION public.create_secure_portal_session(
  project_name_param TEXT,
  password_param TEXT,
  ip_address_param INET DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  
  -- Generate secure session token
  session_token := encode(gen_random_bytes(32), 'base64');
  session_expires := now() + INTERVAL '8 hours'; -- Reduced from 24 hours
  
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
$$;

-- Enhanced session verification with IP validation
CREATE OR REPLACE FUNCTION public.verify_secure_portal_session(
  project_name_param TEXT,
  session_token_param TEXT,
  ip_address_param INET DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
BEGIN
  -- Get session with IP validation
  SELECT * INTO session_record
  FROM public.project_portal_sessions
  WHERE project_name = project_name_param
    AND session_token = session_token_param
    AND expires_at > now()
    AND (ip_address IS NULL OR ip_address = ip_address_param);
    
  IF NOT FOUND THEN
    -- Log suspicious activity if session exists but IP doesn't match
    IF EXISTS (
      SELECT 1 FROM public.project_portal_sessions
      WHERE project_name = project_name_param
        AND session_token = session_token_param
        AND expires_at > now()
        AND ip_address != ip_address_param
    ) THEN
      INSERT INTO public.security_audit_log (event_type, ip_address, details)
      VALUES ('session_ip_mismatch', ip_address_param, 
              jsonb_build_object('project', project_name_param, 'attempted_ip', ip_address_param));
    END IF;
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to clean up expired sessions and rate limits
CREATE OR REPLACE FUNCTION public.cleanup_security_tables()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_deleted INTEGER := 0;
  deleted_count INTEGER;
BEGIN
  -- Clean expired portal sessions
  DELETE FROM public.project_portal_sessions 
  WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  
  -- Clean old rate limit entries (older than 24 hours)
  DELETE FROM public.rate_limit_log 
  WHERE window_start < now() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  
  -- Clean old audit logs (older than 90 days)
  DELETE FROM public.security_audit_log 
  WHERE created_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  
  RETURN total_deleted;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier_time ON public.rate_limit_log (identifier, window_start);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_token ON public.project_portal_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_expires ON public.project_portal_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_time ON public.security_audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_type ON public.security_audit_log (event_type);
