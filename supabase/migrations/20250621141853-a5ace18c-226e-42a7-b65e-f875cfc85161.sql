
-- PHASE 1: EMERGENCY DATA PROTECTION - Fix Critical RLS Policy Issues (Corrected)
-- This migration removes public access to sensitive data and implements proper authentication-based access

-- Step 1: Drop ALL existing policies to avoid conflicts
DO $$ 
DECLARE
    pol_record RECORD;
BEGIN
    -- Drop all policies on sensitive tables to start fresh
    FOR pol_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename IN ('projects', 'new_leads', 'all_calls', 'all_appointments', 
                         'facebook_ad_spend', 'speed_to_lead_stats', 
                         'agent_performance_stats', 'agents', 'csv_import_history',
                         'form_templates', 'project_forms', 'form_submissions')
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                          pol_record.policyname, pol_record.schemaname, pol_record.tablename);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors for policies that don't exist
            NULL;
        END;
    END LOOP;
END $$;

-- Step 2: Create secure authentication-only policies for sensitive business data
-- Projects table - authenticated users only
CREATE POLICY "Secure_authenticated_projects_access" ON public.projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- New leads - authenticated users only (contains PII)
CREATE POLICY "Secure_authenticated_leads_access" ON public.new_leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- All calls - authenticated users only (contains PII)
CREATE POLICY "Secure_authenticated_calls_access" ON public.all_calls
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- All appointments - authenticated users only (contains PII)
CREATE POLICY "Secure_authenticated_appointments_access" ON public.all_appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Facebook ad spend - authenticated users only
CREATE POLICY "Secure_authenticated_ad_spend_access" ON public.facebook_ad_spend
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Speed to lead stats - authenticated users only
CREATE POLICY "Secure_authenticated_speed_stats_access" ON public.speed_to_lead_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Agent performance stats - authenticated users only
CREATE POLICY "Secure_authenticated_agent_stats_access" ON public.agent_performance_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Agents - authenticated users only
CREATE POLICY "Secure_authenticated_agents_access" ON public.agents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CSV import history - authenticated users only
CREATE POLICY "Secure_authenticated_csv_history_access" ON public.csv_import_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Step 3: Form system - proper public access for legitimate use
-- Form templates - public read access for forms, authenticated management
CREATE POLICY "Secure_public_read_form_templates" ON public.form_templates
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Secure_authenticated_manage_form_templates" ON public.form_templates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Secure_authenticated_update_form_templates" ON public.form_templates
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Secure_authenticated_delete_form_templates" ON public.form_templates
  FOR DELETE TO authenticated USING (true);

-- Project forms - public read access for forms, authenticated management
CREATE POLICY "Secure_public_read_project_forms" ON public.project_forms
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Secure_authenticated_manage_project_forms" ON public.project_forms
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Secure_authenticated_update_project_forms" ON public.project_forms
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Secure_authenticated_delete_project_forms" ON public.project_forms
  FOR DELETE TO authenticated USING (true);

-- Form submissions - public insert for submissions, authenticated read/management
CREATE POLICY "Secure_public_submit_forms" ON public.form_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Secure_authenticated_read_form_submissions" ON public.form_submissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Secure_authenticated_manage_form_submissions" ON public.form_submissions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Secure_authenticated_delete_form_submissions" ON public.form_submissions
  FOR DELETE TO authenticated USING (true);

-- Step 4: Revoke dangerous grants and set proper permissions
REVOKE ALL ON public.projects FROM anon;
REVOKE ALL ON public.new_leads FROM anon;
REVOKE ALL ON public.all_calls FROM anon;
REVOKE ALL ON public.all_appointments FROM anon;
REVOKE ALL ON public.facebook_ad_spend FROM anon;
REVOKE ALL ON public.speed_to_lead_stats FROM anon;
REVOKE ALL ON public.agent_performance_stats FROM anon;
REVOKE ALL ON public.agents FROM anon;
REVOKE ALL ON public.csv_import_history FROM anon;

-- Grant proper access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.new_leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.all_calls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.all_appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facebook_ad_spend TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.speed_to_lead_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_performance_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.csv_import_history TO authenticated;

-- Maintain public access only for forms
GRANT SELECT ON public.form_templates TO anon;
GRANT SELECT ON public.project_forms TO anon;
GRANT INSERT ON public.form_submissions TO anon;

-- Step 5: Create enhanced security monitoring function
CREATE OR REPLACE FUNCTION public.log_security_event_critical(
  event_type_param text,
  ip_address_param inet DEFAULT NULL,
  user_agent_param text DEFAULT NULL,
  details_param jsonb DEFAULT NULL,
  severity_param text DEFAULT 'CRITICAL'
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
      'details', details_param,
      'critical_alert', true
    )
  );
END;
$$;

-- Step 6: Create function to validate policy effectiveness
CREATE OR REPLACE FUNCTION public.validate_security_policies()
RETURNS TABLE(
  table_name text,
  has_rls boolean,
  public_access_count integer,
  authenticated_access_count integer,
  security_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::text,
    CASE WHEN t.rowsecurity THEN true ELSE false END as has_rls,
    COUNT(CASE WHEN p.roles && ARRAY['anon'] THEN 1 END)::integer as public_access_count,
    COUNT(CASE WHEN p.roles && ARRAY['authenticated'] THEN 1 END)::integer as authenticated_access_count,
    CASE 
      WHEN NOT t.rowsecurity THEN 'CRITICAL: RLS DISABLED'
      WHEN COUNT(CASE WHEN p.roles && ARRAY['anon'] THEN 1 END) > 0 
           AND t.tablename IN ('projects', 'new_leads', 'all_calls', 'all_appointments', 
                              'facebook_ad_spend', 'speed_to_lead_stats', 
                              'agent_performance_stats', 'agents', 'csv_import_history') 
      THEN 'HIGH RISK: PUBLIC ACCESS TO SENSITIVE DATA'
      ELSE 'SECURE'
    END as security_status
  FROM pg_tables t
  LEFT JOIN pg_policies p ON p.tablename = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('projects', 'new_leads', 'all_calls', 'all_appointments', 
                       'facebook_ad_spend', 'speed_to_lead_stats', 
                       'agent_performance_stats', 'agents', 'csv_import_history',
                       'form_templates', 'project_forms', 'form_submissions')
  GROUP BY t.tablename, t.rowsecurity
  ORDER BY t.tablename;
END;
$$;
