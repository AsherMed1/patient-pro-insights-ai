
-- Update RLS policies to allow public access to all tables
-- This removes authentication requirements since data is not sensitive

-- Projects table - allow public access
DROP POLICY IF EXISTS "Allow public read access to projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public insert to projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public update to projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public delete to projects" ON public.projects;

CREATE POLICY "Allow all public access to projects" ON public.projects FOR ALL USING (true);

-- New leads table - allow public access
DROP POLICY IF EXISTS "Allow public read access to new_leads" ON public.new_leads;
DROP POLICY IF EXISTS "Allow public insert to new_leads" ON public.new_leads;
DROP POLICY IF EXISTS "Allow public update to new_leads" ON public.new_leads;
DROP POLICY IF EXISTS "Allow public delete to new_leads" ON public.new_leads;

CREATE POLICY "Allow all public access to new_leads" ON public.new_leads FOR ALL USING (true);

-- All calls table - allow public access
DROP POLICY IF EXISTS "Allow public read access to all_calls" ON public.all_calls;
DROP POLICY IF EXISTS "Allow public insert to all_calls" ON public.all_calls;
DROP POLICY IF EXISTS "Allow public update to all_calls" ON public.all_calls;
DROP POLICY IF EXISTS "Allow public delete to all_calls" ON public.all_calls;

CREATE POLICY "Allow all public access to all_calls" ON public.all_calls FOR ALL USING (true);

-- All appointments table - allow public access
DROP POLICY IF EXISTS "Allow public read access to all_appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Allow public insert to all_appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Allow public update to all_appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Allow public delete to all_appointments" ON public.all_appointments;

CREATE POLICY "Allow all public access to all_appointments" ON public.all_appointments FOR ALL USING (true);

-- Facebook ad spend table - allow public access
DROP POLICY IF EXISTS "Allow public read access to facebook_ad_spend" ON public.facebook_ad_spend;
DROP POLICY IF EXISTS "Allow public insert to facebook_ad_spend" ON public.facebook_ad_spend;
DROP POLICY IF EXISTS "Allow public update to facebook_ad_spend" ON public.facebook_ad_spend;
DROP POLICY IF EXISTS "Allow public delete to facebook_ad_spend" ON public.facebook_ad_spend;

CREATE POLICY "Allow all public access to facebook_ad_spend" ON public.facebook_ad_spend FOR ALL USING (true);

-- Speed to lead stats table - allow public access
DROP POLICY IF EXISTS "Allow public read access to speed_to_lead_stats" ON public.speed_to_lead_stats;
DROP POLICY IF EXISTS "Allow public insert to speed_to_lead_stats" ON public.speed_to_lead_stats;
DROP POLICY IF EXISTS "Allow public update to speed_to_lead_stats" ON public.speed_to_lead_stats;
DROP POLICY IF EXISTS "Allow public delete to speed_to_lead_stats" ON public.speed_to_lead_stats;

CREATE POLICY "Allow all public access to speed_to_lead_stats" ON public.speed_to_lead_stats FOR ALL USING (true);

-- Agent performance stats table - allow public access
DROP POLICY IF EXISTS "Allow public read access to agent_performance_stats" ON public.agent_performance_stats;
DROP POLICY IF EXISTS "Allow public insert to agent_performance_stats" ON public.agent_performance_stats;
DROP POLICY IF EXISTS "Allow public update to agent_performance_stats" ON public.agent_performance_stats;
DROP POLICY IF EXISTS "Allow public delete to agent_performance_stats" ON public.agent_performance_stats;

CREATE POLICY "Allow all public access to agent_performance_stats" ON public.agent_performance_stats FOR ALL USING (true);

-- Agents table - allow public access
DROP POLICY IF EXISTS "Allow public read access to agents" ON public.agents;
DROP POLICY IF EXISTS "Allow public insert to agents" ON public.agents;
DROP POLICY IF EXISTS "Allow public update to agents" ON public.agents;
DROP POLICY IF EXISTS "Allow public delete to agents" ON public.agents;

CREATE POLICY "Allow all public access to agents" ON public.agents FOR ALL USING (true);

-- CSV import history table - allow public access
DROP POLICY IF EXISTS "Allow public read access to csv_import_history" ON public.csv_import_history;
DROP POLICY IF EXISTS "Allow public insert to csv_import_history" ON public.csv_import_history;
DROP POLICY IF EXISTS "Allow public update to csv_import_history" ON public.csv_import_history;
DROP POLICY IF EXISTS "Allow public delete to csv_import_history" ON public.csv_import_history;

CREATE POLICY "Allow all public access to csv_import_history" ON public.csv_import_history FOR ALL USING (true);

-- Form templates table - allow public access
DROP POLICY IF EXISTS "Allow public read access to form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Allow public insert to form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Allow public update to form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Allow public delete to form_templates" ON public.form_templates;

CREATE POLICY "Allow all public access to form_templates" ON public.form_templates FOR ALL USING (true);

-- Form submissions table - allow public access
DROP POLICY IF EXISTS "Allow public read access to form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Allow public insert to form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Allow public update to form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Allow public delete to form_submissions" ON public.form_submissions;

CREATE POLICY "Allow all public access to form_submissions" ON public.form_submissions FOR ALL USING (true);

-- Update other tables that may have policies
CREATE POLICY "Allow all public access to project_forms" ON public.project_forms FOR ALL USING (true);
CREATE POLICY "Allow all public access to project_tags" ON public.project_tags FOR ALL USING (true);
CREATE POLICY "Allow all public access to appointment_tags" ON public.appointment_tags FOR ALL USING (true);
CREATE POLICY "Allow all public access to appointment_notes" ON public.appointment_notes FOR ALL USING (true);
