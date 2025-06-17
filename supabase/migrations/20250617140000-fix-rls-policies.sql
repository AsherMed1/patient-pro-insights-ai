
-- Enable RLS on all tables that don't have it yet
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_ad_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_to_lead_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Create basic policies for public access (can be made more restrictive later)
-- Projects table policies
CREATE POLICY "Allow public read access to projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow public insert to projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to projects" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to projects" ON public.projects FOR DELETE USING (true);

-- New leads table policies
CREATE POLICY "Allow public read access to new_leads" ON public.new_leads FOR SELECT USING (true);
CREATE POLICY "Allow public insert to new_leads" ON public.new_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to new_leads" ON public.new_leads FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to new_leads" ON public.new_leads FOR DELETE USING (true);

-- All calls table policies
CREATE POLICY "Allow public read access to all_calls" ON public.all_calls FOR SELECT USING (true);
CREATE POLICY "Allow public insert to all_calls" ON public.all_calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to all_calls" ON public.all_calls FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to all_calls" ON public.all_calls FOR DELETE USING (true);

-- All appointments table policies
CREATE POLICY "Allow public read access to all_appointments" ON public.all_appointments FOR SELECT USING (true);
CREATE POLICY "Allow public insert to all_appointments" ON public.all_appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to all_appointments" ON public.all_appointments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to all_appointments" ON public.all_appointments FOR DELETE USING (true);

-- Facebook ad spend table policies
CREATE POLICY "Allow public read access to facebook_ad_spend" ON public.facebook_ad_spend FOR SELECT USING (true);
CREATE POLICY "Allow public insert to facebook_ad_spend" ON public.facebook_ad_spend FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to facebook_ad_spend" ON public.facebook_ad_spend FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to facebook_ad_spend" ON public.facebook_ad_spend FOR DELETE USING (true);

-- Speed to lead stats table policies
CREATE POLICY "Allow public read access to speed_to_lead_stats" ON public.speed_to_lead_stats FOR SELECT USING (true);
CREATE POLICY "Allow public insert to speed_to_lead_stats" ON public.speed_to_lead_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to speed_to_lead_stats" ON public.speed_to_lead_stats FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to speed_to_lead_stats" ON public.speed_to_lead_stats FOR DELETE USING (true);

-- Agent performance stats table policies
CREATE POLICY "Allow public read access to agent_performance_stats" ON public.agent_performance_stats FOR SELECT USING (true);
CREATE POLICY "Allow public insert to agent_performance_stats" ON public.agent_performance_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to agent_performance_stats" ON public.agent_performance_stats FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to agent_performance_stats" ON public.agent_performance_stats FOR DELETE USING (true);

-- Agents table policies
CREATE POLICY "Allow public read access to agents" ON public.agents FOR SELECT USING (true);
CREATE POLICY "Allow public insert to agents" ON public.agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to agents" ON public.agents FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to agents" ON public.agents FOR DELETE USING (true);

-- CSV import history table policies
CREATE POLICY "Allow public read access to csv_import_history" ON public.csv_import_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert to csv_import_history" ON public.csv_import_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to csv_import_history" ON public.csv_import_history FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to csv_import_history" ON public.csv_import_history FOR DELETE USING (true);

-- Form templates table policies
CREATE POLICY "Allow public read access to form_templates" ON public.form_templates FOR SELECT USING (true);
CREATE POLICY "Allow public insert to form_templates" ON public.form_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to form_templates" ON public.form_templates FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to form_templates" ON public.form_templates FOR DELETE USING (true);

-- Form submissions table policies
CREATE POLICY "Allow public read access to form_submissions" ON public.form_submissions FOR SELECT USING (true);
CREATE POLICY "Allow public insert to form_submissions" ON public.form_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to form_submissions" ON public.form_submissions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to form_submissions" ON public.form_submissions FOR DELETE USING (true);

-- Fix any potential foreign key issues by ensuring proper references
-- Note: We're avoiding direct references to auth.users as recommended

-- Add indexes for better performance on commonly queried columns
CREATE INDEX IF NOT EXISTS idx_projects_project_name ON public.projects(project_name);
CREATE INDEX IF NOT EXISTS idx_new_leads_project_name ON public.new_leads(project_name);
CREATE INDEX IF NOT EXISTS idx_all_calls_project_name ON public.all_calls(project_name);
CREATE INDEX IF NOT EXISTS idx_all_appointments_project_name ON public.all_appointments(project_name);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_spend_project_name ON public.facebook_ad_spend(project_name);
CREATE INDEX IF NOT EXISTS idx_speed_to_lead_stats_project_name ON public.speed_to_lead_stats(project_name);

-- Ensure all tables have proper updated_at triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to tables that might be missing them
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_projects_updated_at') THEN
    CREATE TRIGGER handle_projects_updated_at
      BEFORE UPDATE ON public.projects
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_new_leads_updated_at') THEN
    CREATE TRIGGER handle_new_leads_updated_at
      BEFORE UPDATE ON public.new_leads
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_all_calls_updated_at') THEN
    CREATE TRIGGER handle_all_calls_updated_at
      BEFORE UPDATE ON public.all_calls
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_all_appointments_updated_at') THEN
    CREATE TRIGGER handle_all_appointments_updated_at
      BEFORE UPDATE ON public.all_appointments
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;
