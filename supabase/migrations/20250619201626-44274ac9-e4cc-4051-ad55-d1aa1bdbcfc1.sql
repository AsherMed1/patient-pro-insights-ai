
-- Comprehensive fix for all remaining Supabase warnings
-- This migration will ensure all tables have proper RLS and policies

-- First, let's ensure all tables have RLS enabled
ALTER TABLE public.project_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Anyone can read form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Authenticated manage form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Public can submit forms" ON public.form_submissions;
DROP POLICY IF EXISTS "Authenticated manage form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Anyone can read project_forms" ON public.project_forms;
DROP POLICY IF EXISTS "Authenticated manage project_forms" ON public.project_forms;

-- Create proper policies for form_templates (public read, authenticated write)
CREATE POLICY "Public read form_templates" ON public.form_templates
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated write form_templates" ON public.form_templates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update form_templates" ON public.form_templates
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated delete form_templates" ON public.form_templates
  FOR DELETE TO authenticated USING (true);

-- Create proper policies for project_forms (public read, authenticated write)
CREATE POLICY "Public read project_forms" ON public.project_forms
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated write project_forms" ON public.project_forms
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update project_forms" ON public.project_forms
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated delete project_forms" ON public.project_forms
  FOR DELETE TO authenticated USING (true);

-- Create proper policies for form_submissions (public insert, authenticated read/write)
CREATE POLICY "Public submit forms" ON public.form_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Authenticated read form_submissions" ON public.form_submissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated update form_submissions" ON public.form_submissions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated delete form_submissions" ON public.form_submissions
  FOR DELETE TO authenticated USING (true);

-- Ensure proper permissions are granted
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.form_templates TO anon;
GRANT SELECT ON public.project_forms TO anon;
GRANT INSERT ON public.form_submissions TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
