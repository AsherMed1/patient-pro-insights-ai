
-- Comprehensive Supabase Warnings Resolution
-- This migration addresses all remaining RLS and security policy issues

-- First, ensure all tables have RLS enabled that might be missing it
ALTER TABLE public.project_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean up any problematic existing policies that might cause conflicts
DROP POLICY IF EXISTS "Allow public read access to projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public insert to projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public update to projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public delete to projects" ON public.projects;

DROP POLICY IF EXISTS "Allow public read access to new_leads" ON public.new_leads;
DROP POLICY IF EXISTS "Allow public insert to new_leads" ON public.new_leads;
DROP POLICY IF EXISTS "Allow public update to new_leads" ON public.new_leads;
DROP POLICY IF EXISTS "Allow public delete to new_leads" ON public.new_leads;

DROP POLICY IF EXISTS "Allow public read access to all_calls" ON public.all_calls;
DROP POLICY IF EXISTS "Allow public insert to all_calls" ON public.all_calls;
DROP POLICY IF EXISTS "Allow public update to all_calls" ON public.all_calls;
DROP POLICY IF EXISTS "Allow public delete to all_calls" ON public.all_calls;

DROP POLICY IF EXISTS "Allow public read access to all_appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Allow public insert to all_appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Allow public update to all_appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Allow public delete to all_appointments" ON public.all_appointments;

DROP POLICY IF EXISTS "Allow public read access to facebook_ad_spend" ON public.facebook_ad_spend;
DROP POLICY IF EXISTS "Allow public insert to facebook_ad_spend" ON public.facebook_ad_spend;
DROP POLICY IF EXISTS "Allow public update to facebook_ad_spend" ON public.facebook_ad_spend;
DROP POLICY IF EXISTS "Allow public delete to facebook_ad_spend" ON public.facebook_ad_spend;

-- Create comprehensive authenticated-only policies for main data tables

-- Projects - authenticated access only
CREATE POLICY "Authenticated users manage projects" ON public.projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Leads - authenticated access only  
CREATE POLICY "Authenticated users manage leads" ON public.new_leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Calls - authenticated access only
CREATE POLICY "Authenticated users manage calls" ON public.all_calls
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Appointments - authenticated access only
CREATE POLICY "Authenticated users manage appointments_data" ON public.all_appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ad spend - authenticated access only
CREATE POLICY "Authenticated users manage ad_spend" ON public.facebook_ad_spend
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Speed to lead stats - authenticated access only
CREATE POLICY "Authenticated users manage speed_stats" ON public.speed_to_lead_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Agent performance stats - authenticated access only  
CREATE POLICY "Authenticated users manage agent_stats" ON public.agent_performance_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Agents - authenticated access only
CREATE POLICY "Authenticated users manage agents" ON public.agents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CSV import history - authenticated access only
CREATE POLICY "Authenticated users manage import_history" ON public.csv_import_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Form templates - public read, authenticated write
CREATE POLICY "Public read form_templates" ON public.form_templates
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated manage form_templates" ON public.form_templates
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update form_templates" ON public.form_templates
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete form_templates" ON public.form_templates
  FOR DELETE TO authenticated USING (true);

-- Project forms - public read, authenticated write
CREATE POLICY "Public read project_forms" ON public.project_forms
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated manage project_forms" ON public.project_forms
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update project_forms" ON public.project_forms
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete project_forms" ON public.project_forms
  FOR DELETE TO authenticated USING (true);

-- Form submissions - public insert, authenticated manage
CREATE POLICY "Public submit forms" ON public.form_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authenticated read form_submissions" ON public.form_submissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated update form_submissions" ON public.form_submissions
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete form_submissions" ON public.form_submissions
  FOR DELETE TO authenticated USING (true);

-- Project tags - authenticated access only
CREATE POLICY "Authenticated manage project_tags" ON public.project_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Appointment notes - authenticated access only
CREATE POLICY "Authenticated manage appointment_notes" ON public.appointment_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Appointment tags - authenticated access only
CREATE POLICY "Authenticated manage appointment_tags" ON public.appointment_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Clients - authenticated access only
CREATE POLICY "Authenticated manage clients" ON public.clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Appointments table - authenticated access only
CREATE POLICY "Authenticated manage appointments" ON public.appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Profiles - users can only access their own profile
CREATE POLICY "Users manage own profile" ON public.profiles
  FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Security and system tables - service role access only
CREATE POLICY "Service role manages rate_limits" ON public.api_rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages portal_sessions" ON public.project_portal_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read security_audit" ON public.security_audit_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role manages security_config" ON public.security_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages user_roles" ON public.user_roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grant proper permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.form_templates TO anon;
GRANT SELECT ON public.project_forms TO anon;
GRANT INSERT ON public.form_submissions TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Service role permissions for system functions
GRANT ALL ON public.rate_limit_log TO service_role;
GRANT ALL ON public.project_portal_sessions TO service_role;
GRANT ALL ON public.security_audit_log TO service_role;
GRANT ALL ON public.security_config TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.api_rate_limits TO service_role;
