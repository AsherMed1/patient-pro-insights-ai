-- CRITICAL SECURITY FIX: Remove public access to sensitive medical data

-- Drop dangerous public access policies for all_appointments
DROP POLICY IF EXISTS "Public read all_appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Anonymous portal reads appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Anonymous portal updates appointments" ON public.all_appointments;

-- Drop overly permissive authenticated policies
DROP POLICY IF EXISTS "Allow authenticated read appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Allow authenticated update appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Allow authenticated write appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Authenticated users manage appointments_data" ON public.all_appointments;

-- Create secure RLS policies for all_appointments - only for authorized users
CREATE POLICY "Admins can manage all appointments"
ON public.all_appointments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can manage all appointments"
ON public.all_appointments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'agent'::app_role))
WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

-- Keep the existing secure project user policy (already properly restricted)
-- This policy already exists and is secure: "Project users see assigned project appointments"

-- Fix new_leads table - remove public access
DROP POLICY IF EXISTS "Public read new_leads" ON public.new_leads;
DROP POLICY IF EXISTS "Allow authenticated read leads" ON public.new_leads;
DROP POLICY IF EXISTS "Allow authenticated update leads" ON public.new_leads;
DROP POLICY IF EXISTS "Allow authenticated write leads" ON public.new_leads;
DROP POLICY IF EXISTS "Authenticated users manage leads" ON public.new_leads;

-- Create secure policies for new_leads
CREATE POLICY "Admins can manage all leads"
ON public.new_leads
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can manage all leads"
ON public.new_leads
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'agent'::app_role))
WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

-- Keep the existing secure project user policy for new_leads

-- Fix all_calls table - remove public access
DROP POLICY IF EXISTS "Public read all_calls" ON public.all_calls;
DROP POLICY IF EXISTS "Allow authenticated read calls" ON public.all_calls;
DROP POLICY IF EXISTS "Allow authenticated update calls" ON public.all_calls;
DROP POLICY IF EXISTS "Allow authenticated write calls" ON public.all_calls;
DROP POLICY IF EXISTS "Authenticated users manage calls" ON public.all_calls;

-- Create secure policies for all_calls
CREATE POLICY "Admins can manage all calls"
ON public.all_calls
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can manage all calls"
ON public.all_calls
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'agent'::app_role))
WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

-- Keep the existing secure project user policy for all_calls

-- Fix speed_to_lead_stats table - remove public access
DROP POLICY IF EXISTS "Public read speed_to_lead_stats" ON public.speed_to_lead_stats;
DROP POLICY IF EXISTS "Allow authenticated read speed stats" ON public.speed_to_lead_stats;
DROP POLICY IF EXISTS "Allow authenticated write speed stats" ON public.speed_to_lead_stats;
DROP POLICY IF EXISTS "Authenticated users manage speed_stats" ON public.speed_to_lead_stats;

-- Create secure policies for speed_to_lead_stats
CREATE POLICY "Admins can manage speed stats"
ON public.speed_to_lead_stats
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can manage speed stats"
ON public.speed_to_lead_stats
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'agent'::app_role))
WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

-- Fix projects table - remove public access but allow controlled access for portal functionality
DROP POLICY IF EXISTS "Public read projects" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated read projects" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated update projects" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated write projects" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated delete projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users manage projects" ON public.projects;

-- Create secure policies for projects
CREATE POLICY "Admins can manage all projects"
ON public.projects
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can manage all projects"
ON public.projects
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'agent'::app_role))
WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

-- Keep the existing secure project user policy for projects

-- Fix agents table - remove public access
DROP POLICY IF EXISTS "Public read agents" ON public.agents;
DROP POLICY IF EXISTS "Allow authenticated read agents" ON public.agents;
DROP POLICY IF EXISTS "Allow authenticated write agents" ON public.agents;
DROP POLICY IF EXISTS "Authenticated users manage agents" ON public.agents;

-- Create secure policies for agents
CREATE POLICY "Admins can manage agents"
ON public.agents
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view agents"
ON public.agents
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'agent'::app_role));

-- Log this critical security fix
INSERT INTO public.security_audit_log (event_type, details)
VALUES ('CRITICAL_SECURITY_FIX_RLS_POLICIES', jsonb_build_object(
  'description', 'Removed public access to sensitive medical and business data',
  'tables_secured', ARRAY['all_appointments', 'new_leads', 'all_calls', 'speed_to_lead_stats', 'projects', 'agents'],
  'risk_level', 'CRITICAL',
  'compliance', 'HIPAA_PROTECTION_IMPLEMENTED'
));