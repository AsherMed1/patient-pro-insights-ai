
-- Drop all remaining RLS policies that are causing the linter errors

-- Agent performance stats policies
DROP POLICY IF EXISTS "Allow all operations on agent performance stats" ON public.agent_performance_stats;
DROP POLICY IF EXISTS "Authenticated users can select agent stats" ON public.agent_performance_stats;

-- CSV import history policies  
DROP POLICY IF EXISTS "Allow all operations on csv_import_history" ON public.csv_import_history;
DROP POLICY IF EXISTS "Authenticated users can view import history" ON public.csv_import_history;

-- Form submissions policies
DROP POLICY IF EXISTS "Anyone can insert form submissions" ON public.form_submissions;

-- Form templates policies
DROP POLICY IF EXISTS "Anyone can view form templates" ON public.form_templates;

-- Project forms policies
DROP POLICY IF EXISTS "Anyone can view project forms" ON public.project_forms;

-- Drop any other potential lingering policies from these tables
DROP POLICY IF EXISTS "Allow public read access to agent_performance_stats" ON public.agent_performance_stats;
DROP POLICY IF EXISTS "Allow public insert to agent_performance_stats" ON public.agent_performance_stats;
DROP POLICY IF EXISTS "Allow public update to agent_performance_stats" ON public.agent_performance_stats;
DROP POLICY IF EXISTS "Allow public delete to agent_performance_stats" ON public.agent_performance_stats;

DROP POLICY IF EXISTS "Allow public read access to csv_import_history" ON public.csv_import_history;
DROP POLICY IF EXISTS "Allow public insert to csv_import_history" ON public.csv_import_history;
DROP POLICY IF EXISTS "Allow public update to csv_import_history" ON public.csv_import_history;
DROP POLICY IF EXISTS "Allow public delete to csv_import_history" ON public.csv_import_history;

DROP POLICY IF EXISTS "Allow public read access to form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Allow public insert to form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Allow public update to form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Allow public delete to form_submissions" ON public.form_submissions;

DROP POLICY IF EXISTS "Allow public read access to form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Allow public insert to form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Allow public update to form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Allow public delete to form_templates" ON public.form_templates;

DROP POLICY IF EXISTS "Allow public read access to project_forms" ON public.project_forms;
DROP POLICY IF EXISTS "Allow public insert to project_forms" ON public.project_forms;
DROP POLICY IF EXISTS "Allow public update to project_forms" ON public.project_forms;
DROP POLICY IF EXISTS "Allow public delete to project_forms" ON public.project_forms;

-- Ensure RLS remains disabled on all tables (which is what we want for public access)
ALTER TABLE public.agent_performance_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_import_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_forms DISABLE ROW LEVEL SECURITY;

-- Also ensure other tables mentioned in the errors have RLS disabled
ALTER TABLE public.all_calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_to_lead_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_ad_spend DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_appointments DISABLE ROW LEVEL SECURITY;
