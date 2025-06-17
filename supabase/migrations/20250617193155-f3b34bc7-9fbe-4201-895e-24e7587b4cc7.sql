
-- Drop all RLS policies from all tables (including the missing ones)
-- Agents table
DROP POLICY IF EXISTS "Admins and managers can delete agents" ON public.agents;
DROP POLICY IF EXISTS "Admins and managers can insert agents" ON public.agents;
DROP POLICY IF EXISTS "Admins and managers can update agents" ON public.agents;
DROP POLICY IF EXISTS "Authenticated users can view agents" ON public.agents;

-- All appointments table
DROP POLICY IF EXISTS "Admins and managers can delete appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Admins and managers can insert appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Admins and managers can update appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Users can select appointments for their projects" ON public.all_appointments;

-- All calls table
DROP POLICY IF EXISTS "Admins and managers can delete calls" ON public.all_calls;
DROP POLICY IF EXISTS "Admins and managers can insert calls" ON public.all_calls;
DROP POLICY IF EXISTS "Admins and managers can update calls" ON public.all_calls;
DROP POLICY IF EXISTS "Users can select calls for their projects" ON public.all_calls;

-- Facebook ad spend table
DROP POLICY IF EXISTS "Admins and managers can delete ad spend" ON public.facebook_ad_spend;
DROP POLICY IF EXISTS "Admins and managers can insert ad spend" ON public.facebook_ad_spend;
DROP POLICY IF EXISTS "Admins and managers can update ad spend" ON public.facebook_ad_spend;
DROP POLICY IF EXISTS "Allow all operations on facebook_ad_spend" ON public.facebook_ad_spend;
DROP POLICY IF EXISTS "Users can select ad spend for their projects" ON public.facebook_ad_spend;

-- New leads table
DROP POLICY IF EXISTS "Admins and managers can delete leads" ON public.new_leads;
DROP POLICY IF EXISTS "Admins and managers can insert leads" ON public.new_leads;
DROP POLICY IF EXISTS "Admins and managers can select leads" ON public.new_leads;
DROP POLICY IF EXISTS "Admins and managers can update leads" ON public.new_leads;

-- Projects table
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can select all projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects they have access to" ON public.projects;

-- Speed to lead stats table
DROP POLICY IF EXISTS "Admins and managers can delete speed to lead stats" ON public.speed_to_lead_stats;
DROP POLICY IF EXISTS "Admins and managers can insert speed to lead stats" ON public.speed_to_lead_stats;
DROP POLICY IF EXISTS "Admins and managers can update speed to lead stats" ON public.speed_to_lead_stats;
DROP POLICY IF EXISTS "Authenticated users can select speed to lead stats" ON public.speed_to_lead_stats;

-- User roles table policies (these are blocking the function drop)
DROP POLICY IF EXISTS "Admins can select all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;

-- Project permissions table policies
DROP POLICY IF EXISTS "Admins can select all project permissions" ON public.project_permissions;
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.project_permissions;
DROP POLICY IF EXISTS "Admins can insert project permissions" ON public.project_permissions;
DROP POLICY IF EXISTS "Admins can update project permissions" ON public.project_permissions;
DROP POLICY IF EXISTS "Admins can delete project permissions" ON public.project_permissions;

-- Form submissions table policies
DROP POLICY IF EXISTS "Admins and managers can select form submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Admins and managers can update form submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Admins and managers can delete form submissions" ON public.form_submissions;

-- Form templates table policies
DROP POLICY IF EXISTS "Admins and managers can insert form templates" ON public.form_templates;
DROP POLICY IF EXISTS "Admins and managers can update form templates" ON public.form_templates;
DROP POLICY IF EXISTS "Admins and managers can delete form templates" ON public.form_templates;

-- Project forms table policies
DROP POLICY IF EXISTS "Admins and managers can insert project forms" ON public.project_forms;
DROP POLICY IF EXISTS "Admins and managers can update project forms" ON public.project_forms;
DROP POLICY IF EXISTS "Admins and managers can delete project forms" ON public.project_forms;

-- Agent performance stats table policies
DROP POLICY IF EXISTS "Admins and managers can insert agent stats" ON public.agent_performance_stats;
DROP POLICY IF EXISTS "Admins and managers can update agent stats" ON public.agent_performance_stats;
DROP POLICY IF EXISTS "Admins and managers can delete agent stats" ON public.agent_performance_stats;

-- CSV import history table policies
DROP POLICY IF EXISTS "Admins and managers can insert import history" ON public.csv_import_history;
DROP POLICY IF EXISTS "Admins and managers can update import history" ON public.csv_import_history;
DROP POLICY IF EXISTS "Admins and managers can delete import history" ON public.csv_import_history;

-- Disable RLS on all tables
ALTER TABLE public.agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_ad_spend DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_to_lead_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_forms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_import_history DISABLE ROW LEVEL SECURITY;

-- Drop the auth trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Now drop authentication-related tables (this will cascade and remove dependent policies)
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.project_permissions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop authentication-related functions
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.has_project_permission(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop the app_role enum type
DROP TYPE IF EXISTS public.app_role CASCADE;
