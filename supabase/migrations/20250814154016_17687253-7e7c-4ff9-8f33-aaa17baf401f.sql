-- Fix remaining security vulnerabilities and implement HIPAA compliance features

-- Step 1: Fix public access vulnerabilities in remaining tables
-- Remove overly permissive public policies from project_forms
DROP POLICY IF EXISTS "Public read project_forms" ON public.project_forms;
DROP POLICY IF EXISTS "Secure_public_read_project_forms" ON public.project_forms;

-- Remove overly permissive public policies from project_tags  
DROP POLICY IF EXISTS "Allow all public access to project_tags" ON public.project_tags;

-- Remove overly permissive public policies from form_templates
DROP POLICY IF EXISTS "Public read form_templates" ON public.form_templates;
DROP POLICY IF EXISTS "Secure_public_read_form_templates" ON public.form_templates;

-- Create secure role-based policies for project_forms
CREATE POLICY "Secure_authenticated_read_project_forms" 
ON public.project_forms 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'agent'::app_role) OR
  (has_role(auth.uid(), 'project_user'::app_role) AND EXISTS (
    SELECT 1 FROM project_user_access pua 
    WHERE pua.user_id = auth.uid() AND pua.project_id = project_forms.project_id
  ))
);

-- Create secure role-based policies for project_tags
CREATE POLICY "Secure_authenticated_manage_project_tags" 
ON public.project_tags 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'agent'::app_role) OR
  (has_role(auth.uid(), 'project_user'::app_role) AND EXISTS (
    SELECT 1 FROM project_user_access pua 
    WHERE pua.user_id = auth.uid() AND pua.project_id = project_tags.project_id
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'agent'::app_role) OR
  (has_role(auth.uid(), 'project_user'::app_role) AND EXISTS (
    SELECT 1 FROM project_user_access pua 
    WHERE pua.user_id = auth.uid() AND pua.project_id = project_tags.project_id
  ))
);

-- Create secure role-based policies for form_templates
CREATE POLICY "Secure_authenticated_read_form_templates" 
ON public.form_templates 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'agent'::app_role) OR
  has_role(auth.uid(), 'project_user'::app_role)
);

-- Step 2: Implement HIPAA Compliance Features

-- Enhanced audit logging table for HIPAA compliance
CREATE TABLE IF NOT EXISTS public.hipaa_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  resource_type text NOT NULL, -- 'appointment', 'patient_data', 'form_submission', etc.
  resource_id uuid,
  action text NOT NULL, -- 'view', 'create', 'update', 'delete', 'export'
  ip_address inet,
  user_agent text,
  session_id text,
  phi_accessed boolean DEFAULT false, -- Flag for PHI access
  access_justification text, -- Business justification for access
  patient_identifier text, -- For tracking which patient's data was accessed
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on HIPAA audit log
ALTER TABLE public.hipaa_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admin_only_audit_log_access" 
ON public.hipaa_audit_log 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert audit entries
CREATE POLICY "Service_audit_log_insert" 
ON public.hipaa_audit_log 
FOR INSERT 
WITH CHECK (true);

-- Session management table for HIPAA compliance
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  session_token text UNIQUE NOT NULL,
  ip_address inet,
  user_agent text,
  last_activity timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  terminated_reason text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on user sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users_own_sessions" 
ON public.user_sessions 
FOR SELECT 
USING (user_id = auth.uid());

-- Admins can see all sessions
CREATE POLICY "Admin_all_sessions" 
ON public.user_sessions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Data retention policies table
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  retention_period_days integer NOT NULL,
  policy_type text NOT NULL, -- 'delete', 'anonymize', 'archive'
  conditions jsonb, -- Additional conditions for retention
  is_active boolean DEFAULT true,
  last_executed timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on retention policies
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

-- Only admins can manage retention policies
CREATE POLICY "Admin_retention_policies" 
ON public.data_retention_policies 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Patient data access tracking
CREATE TABLE IF NOT EXISTS public.patient_data_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  patient_identifier text NOT NULL, -- lead_name or patient ID
  project_name text NOT NULL,
  access_type text NOT NULL, -- 'view', 'edit', 'export', 'print'
  data_elements text[], -- Array of accessed fields
  purpose text, -- Business purpose for access
  duration_seconds integer, -- How long the data was accessed
  ip_address inet,
  session_id text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on patient data access
ALTER TABLE public.patient_data_access ENABLE ROW LEVEL SECURITY;

-- Admins can view all access logs
CREATE POLICY "Admin_patient_access_logs" 
ON public.patient_data_access 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own access logs
CREATE POLICY "User_own_access_logs" 
ON public.patient_data_access 
FOR SELECT 
USING (user_id = auth.uid());

-- Service role can insert access logs
CREATE POLICY "Service_patient_access_insert" 
ON public.patient_data_access 
FOR INSERT 
WITH CHECK (true);

-- Function to log HIPAA audit events
CREATE OR REPLACE FUNCTION log_hipaa_audit(
  p_event_type text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_action text DEFAULT 'view',
  p_phi_accessed boolean DEFAULT true,
  p_patient_identifier text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  audit_id uuid;
BEGIN
  INSERT INTO hipaa_audit_log (
    user_id,
    event_type,
    resource_type,
    resource_id,
    action,
    phi_accessed,
    patient_identifier,
    metadata
  ) VALUES (
    auth.uid(),
    p_event_type,
    p_resource_type,
    p_resource_id,
    p_action,
    p_phi_accessed,
    p_patient_identifier,
    COALESCE(p_metadata, jsonb_build_object('timestamp', now()))
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

-- Function to log patient data access
CREATE OR REPLACE FUNCTION log_patient_access(
  p_patient_identifier text,
  p_project_name text,
  p_access_type text,
  p_data_elements text[] DEFAULT ARRAY[]::text[],
  p_purpose text DEFAULT 'routine_care'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_id uuid;
BEGIN
  INSERT INTO patient_data_access (
    user_id,
    patient_identifier,
    project_name,
    access_type,
    data_elements,
    purpose
  ) VALUES (
    auth.uid(),
    p_patient_identifier,
    p_project_name,
    p_access_type,
    p_data_elements,
    p_purpose
  ) RETURNING id INTO access_id;
  
  RETURN access_id;
END;
$$;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_count integer;
BEGIN
  UPDATE user_sessions 
  SET is_active = false, terminated_reason = 'expired'
  WHERE expires_at < now() AND is_active = true;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN cleaned_count;
END;
$$;

-- Triggers for automatic HIPAA audit logging
CREATE OR REPLACE FUNCTION trigger_hipaa_audit_appointments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log PHI access for appointments
  IF TG_OP = 'SELECT' THEN
    PERFORM log_hipaa_audit(
      'appointment_access',
      'appointment',
      COALESCE(NEW.id, OLD.id),
      'view',
      true,
      COALESCE(NEW.lead_name, OLD.lead_name)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_hipaa_audit(
      'appointment_update',
      'appointment', 
      NEW.id,
      'update',
      true,
      NEW.lead_name,
      jsonb_build_object('changes', to_jsonb(NEW) - to_jsonb(OLD))
    );
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM log_hipaa_audit(
      'appointment_create',
      'appointment',
      NEW.id,
      'create', 
      true,
      NEW.lead_name
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply HIPAA audit triggers to sensitive tables
CREATE TRIGGER hipaa_audit_appointments_trigger
  AFTER INSERT OR UPDATE ON all_appointments
  FOR EACH ROW EXECUTE FUNCTION trigger_hipaa_audit_appointments();

-- Insert default data retention policies for HIPAA compliance
INSERT INTO data_retention_policies (table_name, retention_period_days, policy_type) VALUES
('all_appointments', 2555, 'archive'), -- 7 years for medical records
('new_leads', 2555, 'archive'), -- 7 years for patient data
('appointment_notes', 2555, 'archive'), -- 7 years for clinical notes
('hipaa_audit_log', 2555, 'archive'), -- 7 years for audit logs
('patient_data_access', 2555, 'archive'), -- 7 years for access logs
('user_sessions', 90, 'delete'), -- 90 days for session data
('security_audit_log', 2555, 'archive') -- 7 years for security logs
ON CONFLICT DO NOTHING;

-- Log this HIPAA compliance implementation
INSERT INTO security_audit_log (event_type, details)
VALUES ('HIPAA_compliance_implementation', jsonb_build_object(
  'severity', 'INFO',
  'action', 'Implemented core HIPAA compliance features',
  'features', ARRAY[
    'Enhanced audit logging',
    'Session management', 
    'Patient data access tracking',
    'Data retention policies',
    'Secure RLS policies',
    'PHI access logging'
  ],
  'compliance_level', 'Basic HIPAA technical safeguards',
  'next_steps', 'Implement MFA, password policies, and incident response',
  'timestamp', now()
));