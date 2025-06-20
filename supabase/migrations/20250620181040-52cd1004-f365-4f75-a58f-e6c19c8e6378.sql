
-- PHASE 1: EMERGENCY DATA PROTECTION - Fix Critical RLS Policy Issues
-- This migration removes public access to sensitive data and implements proper authentication-based access

-- Step 1: Drop all existing public access policies that expose sensitive data
DROP POLICY IF EXISTS "Allow public access to all_calls" ON public.all_calls;
DROP POLICY IF EXISTS "Allow public access to agents" ON public.agents;
DROP POLICY IF EXISTS "Allow public access to projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public access to speed_to_lead_stats" ON public.speed_to_lead_stats;
DROP POLICY IF EXISTS "Allow public access to agent_performance_stats" ON public.agent_performance_stats;
DROP POLICY IF EXISTS "Allow public access to csv_import_history" ON public.csv_import_history;
DROP POLICY IF EXISTS "Allow public access to facebook_ad_spend" ON public.facebook_ad_spend;
DROP POLICY IF EXISTS "Allow public access to new_leads" ON public.new_leads;
DROP POLICY IF EXISTS "Allow public access to all_appointments" ON public.all_appointments;

-- Step 2: Create secure authentication-only policies for sensitive business data
-- All calls table - authenticated users only
CREATE POLICY "Authenticated users access all_calls" ON public.all_calls
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Agents table - authenticated users only  
CREATE POLICY "Authenticated users access agents" ON public.agents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Projects table - authenticated users only
CREATE POLICY "Authenticated users access projects" ON public.projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Speed to lead stats - authenticated users only
CREATE POLICY "Authenticated users access speed_to_lead_stats" ON public.speed_to_lead_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Agent performance stats - authenticated users only
CREATE POLICY "Authenticated users access agent_performance_stats" ON public.agent_performance_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CSV import history - authenticated users only
CREATE POLICY "Authenticated users access csv_import_history" ON public.csv_import_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Facebook ad spend - authenticated users only
CREATE POLICY "Authenticated users access facebook_ad_spend" ON public.facebook_ad_spend
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- New leads - authenticated users only (contains PII)
CREATE POLICY "Authenticated users access new_leads" ON public.new_leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- All appointments - authenticated users only
CREATE POLICY "Authenticated users access all_appointments" ON public.all_appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Step 3: Ensure form system maintains public access for legitimate use
-- Keep existing form policies but ensure they're properly scoped
DROP POLICY IF EXISTS "Allow public access to form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Allow public access to project_forms" ON public.project_forms;
DROP POLICY IF EXISTS "Allow public access to form_submissions" ON public.form_submissions;

-- Form templates - public read access for forms, authenticated management
CREATE POLICY "Public read form_templates" ON public.form_templates
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated manage form_templates" ON public.form_templates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update form_templates" ON public.form_templates
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated delete form_templates" ON public.form_templates
  FOR DELETE TO authenticated USING (true);

-- Project forms - public read access for forms, authenticated management
CREATE POLICY "Public read project_forms" ON public.project_forms
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated manage project_forms" ON public.project_forms
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update project_forms" ON public.project_forms
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated delete project_forms" ON public.project_forms
  FOR DELETE TO authenticated USING (true);

-- Form submissions - public insert for submissions, authenticated read/management
CREATE POLICY "Public submit forms" ON public.form_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Authenticated read form_submissions" ON public.form_submissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated manage form_submissions" ON public.form_submissions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated delete form_submissions" ON public.form_submissions
  FOR DELETE TO authenticated USING (true);

-- Step 4: Create enhanced security audit function for monitoring
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(
  event_type_param text,
  ip_address_param inet DEFAULT NULL,
  user_agent_param text DEFAULT NULL,
  details_param jsonb DEFAULT NULL,
  severity_param text DEFAULT 'INFO'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (event_type, ip_address, user_agent, details)
  VALUES (
    format('%s_%s', severity_param, event_type_param),
    ip_address_param, 
    user_agent_param, 
    jsonb_build_object(
      'severity', severity_param,
      'timestamp', now(),
      'details', details_param
    )
  );
END;
$$;

-- Step 5: Create rate limiting enhancement function
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(
  identifier_param text,
  action_type_param text,
  max_attempts_param integer DEFAULT 5,
  window_minutes_param integer DEFAULT 15
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  attempt_count integer;
BEGIN
  -- Count recent attempts
  SELECT COUNT(*) INTO attempt_count
  FROM public.rate_limit_log
  WHERE identifier = identifier_param
    AND action_type = action_type_param
    AND window_start > now() - (window_minutes_param || ' minutes')::interval;
    
  -- Log this attempt
  INSERT INTO public.rate_limit_log (identifier, action_type, count)
  VALUES (identifier_param, action_type_param, 1)
  ON CONFLICT (identifier, action_type) 
  DO UPDATE SET 
    count = rate_limit_log.count + 1,
    window_start = CASE 
      WHEN rate_limit_log.window_start < now() - (window_minutes_param || ' minutes')::interval 
      THEN now() 
      ELSE rate_limit_log.window_start 
    END;
    
  -- Return whether under limit
  RETURN attempt_count < max_attempts_param;
END;
$$;

-- Step 6: Ensure all sensitive tables have proper grants
REVOKE ALL ON public.all_calls FROM anon;
REVOKE ALL ON public.agents FROM anon;
REVOKE ALL ON public.projects FROM anon;
REVOKE ALL ON public.speed_to_lead_stats FROM anon;
REVOKE ALL ON public.agent_performance_stats FROM anon;
REVOKE ALL ON public.csv_import_history FROM anon;
REVOKE ALL ON public.facebook_ad_spend FROM anon;
REVOKE ALL ON public.new_leads FROM anon;
REVOKE ALL ON public.all_appointments FROM anon;

-- Grant proper access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.all_calls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.speed_to_lead_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_performance_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.csv_import_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facebook_ad_spend TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.new_leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.all_appointments TO authenticated;

-- Maintain public access only for forms
GRANT SELECT ON public.form_templates TO anon;
GRANT SELECT ON public.project_forms TO anon;
GRANT INSERT ON public.form_submissions TO anon;
