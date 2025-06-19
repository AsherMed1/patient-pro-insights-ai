
-- Critical Security Fixes: Database Access Control
-- Remove conflicting public access policies and implement proper user-based access control

-- 1. Remove all public access policies that conflict with authenticated-only access
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

-- 2. Ensure all sensitive tables have RLS enabled
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

-- 3. Create comprehensive authenticated-only policies with proper CRUD operations

-- All Calls - Contains sensitive customer data
CREATE POLICY "Authenticated users can view calls" ON public.all_calls
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert calls" ON public.all_calls
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update calls" ON public.all_calls
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete calls" ON public.all_calls
  FOR DELETE TO authenticated USING (true);

-- All Appointments - Contains PII and medical data
CREATE POLICY "Authenticated users can view appointments" ON public.all_appointments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert appointments" ON public.all_appointments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update appointments" ON public.all_appointments
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete appointments" ON public.all_appointments
  FOR DELETE TO authenticated USING (true);

-- New Leads - Contains PII and sensitive customer information
CREATE POLICY "Authenticated users can view leads" ON public.new_leads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert leads" ON public.new_leads
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update leads" ON public.new_leads
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete leads" ON public.new_leads
  FOR DELETE TO authenticated USING (true);

-- Form Submissions - Contains sensitive form data
CREATE POLICY "Authenticated users can view form submissions" ON public.form_submissions
  FOR SELECT TO authenticated USING (true);
-- Form submissions should allow public insert for forms, but restrict other operations
CREATE POLICY "Public can submit forms" ON public.form_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update form submissions" ON public.form_submissions
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete form submissions" ON public.form_submissions
  FOR DELETE TO authenticated USING (true);

-- Projects - Contains business configuration data
CREATE POLICY "Authenticated users can view projects" ON public.projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update projects" ON public.projects
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete projects" ON public.projects
  FOR DELETE TO authenticated USING (true);

-- Agents - Employee/contractor data
CREATE POLICY "Authenticated users can view agents" ON public.agents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage agents" ON public.agents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Performance and Analytics Data - Restrict to authenticated users
CREATE POLICY "Authenticated users can view speed stats" ON public.speed_to_lead_stats
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage speed stats" ON public.speed_to_lead_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view agent stats" ON public.agent_performance_stats
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage agent stats" ON public.agent_performance_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view import history" ON public.csv_import_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage import history" ON public.csv_import_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view ad spend" ON public.facebook_ad_spend
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage ad spend" ON public.facebook_ad_spend
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Form Templates and Project Forms - Allow public read for forms functionality
CREATE POLICY "Public can view form templates" ON public.form_templates
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated users can manage form templates" ON public.form_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public can view project forms" ON public.project_forms
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated users can manage project forms" ON public.project_forms
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Create secure project portal session management
CREATE TABLE IF NOT EXISTS public.project_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on sessions table
ALTER TABLE public.project_portal_sessions ENABLE ROW LEVEL SECURITY;

-- Sessions should only be accessible by the system
CREATE POLICY "System only access to portal sessions" ON public.project_portal_sessions
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 5. Add function to create secure portal sessions
CREATE OR REPLACE FUNCTION public.create_portal_session(
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

-- 6. Add function to verify portal sessions
CREATE OR REPLACE FUNCTION public.verify_portal_session(
  project_name_param TEXT,
  session_token_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if session exists and is valid
  RETURN EXISTS (
    SELECT 1 
    FROM public.project_portal_sessions
    WHERE project_name = project_name_param
      AND session_token = session_token_param
      AND expires_at > now()
  );
END;
$$;

-- 7. Add function to cleanup expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_portal_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.project_portal_sessions 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 8. Update password hashing for existing projects (if not already hashed)
UPDATE public.projects 
SET portal_password = public.hash_password(portal_password)
WHERE portal_password IS NOT NULL 
  AND length(portal_password) < 60; -- bcrypt hashes are 60 chars
