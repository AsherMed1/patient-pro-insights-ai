
-- Comprehensive Security Fix Migration (CORRECTED)
-- Phase 1: Critical RLS Policy Cleanup and Security Hardening

-- First, drop all conflicting and overly permissive policies
DO $$ 
DECLARE
    pol_record RECORD;
BEGIN
    -- Remove all existing policies to start fresh
    FOR pol_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                          pol_record.policyname, pol_record.schemaname, pol_record.tablename);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- Ensure all sensitive tables have RLS enabled
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_portal_sessions ENABLE ROW LEVEL SECURITY;

-- Create secure, restrictive policies for core business data
-- Projects: Authenticated users only
CREATE POLICY "Authenticated users can manage projects" ON public.projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Leads: Authenticated users only (contains PII)
CREATE POLICY "Authenticated users can manage leads" ON public.new_leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Calls: Authenticated users only (contains PII)
CREATE POLICY "Authenticated users can manage calls" ON public.all_calls
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Appointments: Authenticated users only (contains PII)
CREATE POLICY "Authenticated users can manage appointments" ON public.all_appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Project tags: Authenticated users only
CREATE POLICY "Authenticated users can manage project_tags" ON public.project_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Appointment notes: Authenticated users only (sensitive)
CREATE POLICY "Authenticated users can manage appointment_notes" ON public.appointment_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Appointment tags: Authenticated users only
CREATE POLICY "Authenticated users can manage appointment_tags" ON public.appointment_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Form templates: Public read, authenticated write (for public forms)
CREATE POLICY "Public can read form_templates" ON public.form_templates
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated users can insert form_templates" ON public.form_templates
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update form_templates" ON public.form_templates
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete form_templates" ON public.form_templates
  FOR DELETE TO authenticated USING (true);

-- Project forms: Public read, authenticated write (for public forms)
CREATE POLICY "Public can read project_forms" ON public.project_forms
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated users can insert project_forms" ON public.project_forms
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update project_forms" ON public.project_forms
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete project_forms" ON public.project_forms
  FOR DELETE TO authenticated USING (true);

-- Form submissions: Public insert only, authenticated read/manage
CREATE POLICY "Public can submit forms" ON public.form_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can read form_submissions" ON public.form_submissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update form_submissions" ON public.form_submissions
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete form_submissions" ON public.form_submissions
  FOR DELETE TO authenticated USING (true);

-- Security audit log: Authenticated read only
CREATE POLICY "Authenticated users can read security_audit_log" ON public.security_audit_log
  FOR SELECT TO authenticated USING (true);

-- Rate limit log: Service role only
CREATE POLICY "Service role can manage rate_limit_log" ON public.rate_limit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Portal sessions: Service role only
CREATE POLICY "Service role can manage portal_sessions" ON public.project_portal_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Profiles: Users can only access their own profile
CREATE POLICY "Users can manage own profile" ON public.profiles
  FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Other tables that need authenticated access only
CREATE POLICY "Authenticated users can manage facebook_ad_spend" ON public.facebook_ad_spend
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage speed_to_lead_stats" ON public.speed_to_lead_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage agent_performance_stats" ON public.agent_performance_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage csv_import_history" ON public.csv_import_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage agents" ON public.agents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage clients" ON public.clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage appointments_table" ON public.appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enhanced security functions for better validation
CREATE OR REPLACE FUNCTION public.validate_project_access(project_name_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if project exists and is active
  RETURN EXISTS (
    SELECT 1 FROM public.projects 
    WHERE project_name = project_name_param AND active = true
  );
END;
$$;

-- Enhanced session validation with IP tracking
CREATE OR REPLACE FUNCTION public.validate_secure_session(
  project_name_param text, 
  session_token_param text,
  ip_address_param inet DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type_param text,
  ip_address_param inet DEFAULT NULL,
  user_agent_param text DEFAULT NULL,
  details_param jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.security_audit_log (event_type, ip_address, user_agent, details)
  VALUES (event_type_param, ip_address_param, user_agent_param, details_param);
END;
$$;

-- Add comprehensive indexes for security and performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type_created ON public.security_audit_log (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_identifier_window ON public.rate_limit_log (identifier, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_token_project ON public.project_portal_sessions (session_token, project_name, expires_at);
CREATE INDEX IF NOT EXISTS idx_projects_name_active ON public.projects (project_name, active);

-- Grant proper permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON public.form_templates TO anon;
GRANT SELECT ON public.project_forms TO anon;
GRANT INSERT ON public.form_submissions TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON public.rate_limit_log TO service_role;
GRANT ALL ON public.project_portal_sessions TO service_role;
GRANT INSERT ON public.security_audit_log TO service_role;
