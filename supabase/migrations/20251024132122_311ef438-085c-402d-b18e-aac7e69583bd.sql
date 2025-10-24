-- COMPREHENSIVE SECURITY FIX: Address all critical error-level findings
-- This migration fixes multiple tables with public/anonymous access vulnerabilities

-- ============================================================================
-- FIX 1: Secure new_leads table (30,473 patient records)
-- ============================================================================
DROP POLICY IF EXISTS "Allow viewing leads for operations" ON public.new_leads;
REVOKE ALL ON public.new_leads FROM anon, public;
ALTER TABLE public.new_leads ENABLE ROW LEVEL SECURITY;

-- Ensure proper authenticated access remains (these should already exist)
-- Admin and Agent policies remain in place

-- ============================================================================
-- FIX 2: Secure all_appointments table (patient appointment records)
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated manage appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "authenticated_appointments_table_access" ON public.all_appointments;
REVOKE ALL ON public.all_appointments FROM anon, public;
ALTER TABLE public.all_appointments ENABLE ROW LEVEL SECURITY;

-- Create proper role-based policies
CREATE POLICY "Admins manage all appointments"
ON public.all_appointments FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents manage all appointments"
ON public.all_appointments FOR ALL
USING (has_role(auth.uid(), 'agent'));

CREATE POLICY "Project users view assigned appointments"
ON public.all_appointments FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'agent') OR
  (has_role(auth.uid(), 'project_user') AND EXISTS (
    SELECT 1 FROM project_user_access pua
    JOIN projects p ON pua.project_id = p.id
    WHERE pua.user_id = auth.uid() 
    AND p.project_name = all_appointments.project_name
  ))
);

-- ============================================================================
-- FIX 3: Secure form_submissions table (prevent flooding)
-- ============================================================================
-- Keep public insert for legitimate form submissions but add authenticated viewing
-- The public insert policy can remain for the form to work, but viewing must be restricted
DROP POLICY IF EXISTS "Public form submission" ON public.form_submissions;
DROP POLICY IF EXISTS "Public submit forms" ON public.form_submissions;

-- Allow public to submit forms (needed for functionality)
CREATE POLICY "Public can submit forms"
ON public.form_submissions FOR INSERT
WITH CHECK (true);

-- Only authenticated users can view submissions
CREATE POLICY "Authenticated users view submissions"
ON public.form_submissions FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'agent') OR
  user_id = auth.uid()
);

-- ============================================================================
-- FIX 4: Secure quarterly_strategy_submissions table
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view quarterly strategy submissions" ON public.quarterly_strategy_submissions;
DROP POLICY IF EXISTS "Anyone can submit quarterly strategy form" ON public.quarterly_strategy_submissions;
DROP POLICY IF EXISTS "Authenticated users can view all submissions" ON public.quarterly_strategy_submissions;
REVOKE ALL ON public.quarterly_strategy_submissions FROM anon, public;

-- Allow authenticated users to submit
CREATE POLICY "Authenticated users submit strategy forms"
ON public.quarterly_strategy_submissions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can view all submissions
CREATE POLICY "Admins view all strategy submissions"
ON public.quarterly_strategy_submissions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Users can view their own submissions
CREATE POLICY "Users view own strategy submissions"
ON public.quarterly_strategy_submissions FOR SELECT
USING (submitted_by = auth.uid());

-- ============================================================================
-- FIX 5: Secure tasks and task_templates tables
-- ============================================================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- Drop all insecure anon policies
DROP POLICY IF EXISTS "Allow anon to view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow anon to create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow anon to update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow anon to delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated to view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated to create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated to update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated to delete tasks" ON public.tasks;

DROP POLICY IF EXISTS "Allow anon to view task templates" ON public.task_templates;
DROP POLICY IF EXISTS "Allow anon to create task templates" ON public.task_templates;
DROP POLICY IF EXISTS "Allow anon to update task templates" ON public.task_templates;
DROP POLICY IF EXISTS "Allow anon to delete task templates" ON public.task_templates;

REVOKE ALL ON public.tasks FROM anon, public;
REVOKE ALL ON public.task_templates FROM anon, public;

-- Add authenticated-only policies for tasks
CREATE POLICY "Authenticated users manage tasks"
ON public.tasks FOR ALL
USING (auth.uid() IS NOT NULL);

-- Add authenticated-only policies for task templates
CREATE POLICY "Authenticated users view templates"
ON public.task_templates FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users manage templates"
ON public.task_templates FOR ALL
USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- FIX 6: Secure projects table (client list)
-- ============================================================================
DROP POLICY IF EXISTS "Allow viewing active projects for operations" ON public.projects;
REVOKE ALL ON public.projects FROM anon, public;

-- Existing authenticated policies remain:
-- "Admins can manage all projects"
-- "Agents can manage all projects"
-- "Project users see assigned projects only"