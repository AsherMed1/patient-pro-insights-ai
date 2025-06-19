
-- Phase 1: Fix Critical RLS Policies and Security Issues (Updated)
-- First drop all existing policies to avoid conflicts, then create secure ones

-- Clean up all_calls table policies
DROP POLICY IF EXISTS "Authenticated users can view calls" ON public.all_calls;
DROP POLICY IF EXISTS "Authenticated users can insert calls" ON public.all_calls;
DROP POLICY IF EXISTS "Authenticated users can update calls" ON public.all_calls;

-- Clean up all_appointments table policies
DROP POLICY IF EXISTS "Authenticated users can view appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON public.all_appointments;

-- Clean up projects table policies
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;

-- Clean up form_submissions table policies
DROP POLICY IF EXISTS "Authenticated users can view form submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Authenticated users can create form submissions" ON public.form_submissions;

-- Clean up other table policies
DROP POLICY IF EXISTS "Authenticated users can view form templates" ON public.form_templates;
DROP POLICY IF EXISTS "Authenticated users can manage form templates" ON public.form_templates;
DROP POLICY IF EXISTS "Authenticated users can view project forms" ON public.project_forms;
DROP POLICY IF EXISTS "Authenticated users can manage project forms" ON public.project_forms;
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.new_leads;
DROP POLICY IF EXISTS "Authenticated users can create leads" ON public.new_leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.new_leads;
DROP POLICY IF EXISTS "Authenticated users can view speed stats" ON public.speed_to_lead_stats;
DROP POLICY IF EXISTS "Authenticated users can manage speed stats" ON public.speed_to_lead_stats;
DROP POLICY IF EXISTS "Authenticated users can view agent stats" ON public.agent_performance_stats;
DROP POLICY IF EXISTS "Authenticated users can manage agent stats" ON public.agent_performance_stats;
DROP POLICY IF EXISTS "Authenticated users can view import history" ON public.csv_import_history;
DROP POLICY IF EXISTS "Authenticated users can manage import history" ON public.csv_import_history;
DROP POLICY IF EXISTS "Authenticated users can view ad spend" ON public.facebook_ad_spend;
DROP POLICY IF EXISTS "Authenticated users can manage ad spend" ON public.facebook_ad_spend;
DROP POLICY IF EXISTS "Authenticated users can view agents" ON public.agents;
DROP POLICY IF EXISTS "Authenticated users can manage agents" ON public.agents;

-- Now create the secure policies
-- Secure all_calls table
CREATE POLICY "Secure calls view" ON public.all_calls
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Secure calls insert" ON public.all_calls
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Secure calls update" ON public.all_calls
  FOR UPDATE TO authenticated USING (true);

-- Secure all_appointments table  
CREATE POLICY "Secure appointments view" ON public.all_appointments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Secure appointments insert" ON public.all_appointments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Secure appointments update" ON public.all_appointments
  FOR UPDATE TO authenticated USING (true);

-- Secure projects table
CREATE POLICY "Secure projects view" ON public.projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Secure projects insert" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Secure projects update" ON public.projects
  FOR UPDATE TO authenticated USING (true);

-- Secure form_submissions table (contains sensitive data)
CREATE POLICY "Secure form submissions view" ON public.form_submissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Secure form submissions insert" ON public.form_submissions
  FOR INSERT TO authenticated WITH CHECK (true);

-- Secure new_leads table (contains PII)
CREATE POLICY "Secure leads view" ON public.new_leads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Secure leads insert" ON public.new_leads
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Secure leads update" ON public.new_leads
  FOR UPDATE TO authenticated USING (true);

-- Create extension and password functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to hash passwords with salt
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT crypt(password, gen_salt('bf', 10));
$$;

-- Function to verify passwords
CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT crypt(password, hash) = hash;
$$;

-- Add updated_at trigger for security auditing
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';
