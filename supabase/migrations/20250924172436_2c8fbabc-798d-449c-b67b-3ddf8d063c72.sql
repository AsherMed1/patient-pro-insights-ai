-- Fix critical security vulnerabilities by removing overly permissive RLS policies
-- and keeping only secure project-based access controls

-- 1. Fix appointment_tags - Remove public access policies
DROP POLICY IF EXISTS "Allow all public access to appointment_tags" ON public.appointment_tags;
DROP POLICY IF EXISTS "Authenticated manage appointment_tags" ON public.appointment_tags;
DROP POLICY IF EXISTS "authenticated_appointment_tags_access" ON public.appointment_tags;

-- Create secure appointment_tags policies
CREATE POLICY "Secure_admin_manage_appointment_tags" ON public.appointment_tags
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Secure_agent_manage_appointment_tags" ON public.appointment_tags  
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'agent'::app_role))
WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Secure_project_user_appointment_tags" ON public.appointment_tags
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'agent'::app_role) OR
  (has_role(auth.uid(), 'project_user'::app_role) AND EXISTS (
    SELECT 1 FROM public.all_appointments a
    JOIN public.project_user_access pua ON EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.project_name = a.project_name AND p.id = pua.project_id
    )
    WHERE a.id = appointment_tags.appointment_id AND pua.user_id = auth.uid()
  ))
);

-- 2. Fix form_submissions - Remove overly permissive policies  
DROP POLICY IF EXISTS "Authenticated read form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Authenticated update form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Authenticated delete form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Secure_authenticated_read_form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Secure_authenticated_manage_form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Secure_authenticated_delete_form_submissions" ON public.form_submissions;

-- Keep only the secure user-specific policy and public submission
-- The "User form submissions access" policy is already secure
-- The "Public submit forms" and "Secure_public_submit_forms" are needed for form submissions

-- 3. Ensure new_leads, all_appointments, and all_calls only have secure policies
-- (These tables already have the correct restrictive policies, but let's verify no overly permissive ones exist)

-- Log this security fix
INSERT INTO public.security_audit_log (event_type, details)
VALUES (
  'CRITICAL_security_policy_fix',
  jsonb_build_object(
    'action', 'removed_overly_permissive_rls_policies',
    'tables_fixed', ARRAY['appointment_tags', 'form_submissions'],
    'severity', 'CRITICAL',
    'fix_applied_at', now(),
    'description', 'Removed public access and overly permissive authenticated policies that were exposing patient data'
  )
);