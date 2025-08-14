-- Fix critical security vulnerability: Remove public access to appointment_notes table
-- This table contains sensitive medical information and should only be accessible to authorized users

-- Drop all existing overly permissive policies
DROP POLICY IF EXISTS "Allow all public access to appointment_notes" ON public.appointment_notes;
DROP POLICY IF EXISTS "Authenticated manage appointment_notes" ON public.appointment_notes;
DROP POLICY IF EXISTS "authenticated_appointment_notes_access" ON public.appointment_notes;

-- Create secure role-based policies for appointment_notes
-- Admins can manage all appointment notes
CREATE POLICY "Secure_admin_manage_appointment_notes" 
ON public.appointment_notes 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Agents can manage all appointment notes
CREATE POLICY "Secure_agent_manage_appointment_notes" 
ON public.appointment_notes 
FOR ALL 
USING (has_role(auth.uid(), 'agent'::app_role))
WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

-- Project users can only access notes for appointments in their assigned projects
CREATE POLICY "Secure_project_user_appointment_notes" 
ON public.appointment_notes 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'agent'::app_role) OR 
  (has_role(auth.uid(), 'project_user'::app_role) AND EXISTS (
    SELECT 1 
    FROM all_appointments a
    JOIN project_user_access pua ON EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.project_name = a.project_name 
      AND p.id = pua.project_id
    )
    WHERE a.id = appointment_notes.appointment_id 
    AND pua.user_id = auth.uid()
  ))
);

-- Project users can insert/update notes for appointments in their assigned projects  
CREATE POLICY "Secure_project_user_manage_appointment_notes" 
ON public.appointment_notes 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'agent'::app_role) OR 
  (has_role(auth.uid(), 'project_user'::app_role) AND EXISTS (
    SELECT 1 
    FROM all_appointments a
    JOIN project_user_access pua ON EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.project_name = a.project_name 
      AND p.id = pua.project_id
    )
    WHERE a.id = appointment_notes.appointment_id 
    AND pua.user_id = auth.uid()
  ))
);

CREATE POLICY "Secure_project_user_update_appointment_notes" 
ON public.appointment_notes 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'agent'::app_role) OR 
  (has_role(auth.uid(), 'project_user'::app_role) AND EXISTS (
    SELECT 1 
    FROM all_appointments a
    JOIN project_user_access pua ON EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.project_name = a.project_name 
      AND p.id = pua.project_id
    )
    WHERE a.id = appointment_notes.appointment_id 
    AND pua.user_id = auth.uid()
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'agent'::app_role) OR 
  (has_role(auth.uid(), 'project_user'::app_role) AND EXISTS (
    SELECT 1 
    FROM all_appointments a
    JOIN project_user_access pua ON EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.project_name = a.project_name 
      AND p.id = pua.project_id
    )
    WHERE a.id = appointment_notes.appointment_id 
    AND pua.user_id = auth.uid()
  ))
);

-- Log this critical security fix
INSERT INTO public.security_audit_log (event_type, details)
VALUES ('CRITICAL_appointment_notes_security_fix', jsonb_build_object(
  'severity', 'CRITICAL',
  'action', 'Fixed public access vulnerability in appointment_notes table',
  'old_policies', 'Public access allowed to sensitive medical notes',
  'new_policies', 'Role-based access control implemented',
  'affected_table', 'appointment_notes',
  'compliance', 'HIPAA protection restored',
  'timestamp', now()
));