
-- Comprehensive Supabase Warnings Fix - Fixed Syntax

-- First, ensure all tables have RLS enabled (some may have been missed)
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting or duplicate policies that might cause warnings
DO $$ 
DECLARE
    pol_record RECORD;
BEGIN
    -- Remove any potentially problematic policies
    FOR pol_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND (
            policyname LIKE '%Allow public%' OR 
            policyname LIKE '%Public can%' OR
            policyname LIKE '%public access%' OR
            policyname LIKE '%Allow all%'
        )
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                          pol_record.policyname, pol_record.schemaname, pol_record.tablename);
        EXCEPTION WHEN OTHERS THEN
            -- Continue if policy doesn't exist
            NULL;
        END;
    END LOOP;
END $$;

-- Create comprehensive authenticated-only policies for all tables

-- Project tags policies
DROP POLICY IF EXISTS "Authenticated access to project_tags" ON public.project_tags;
CREATE POLICY "Authenticated users manage project_tags" ON public.project_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Appointment notes policies  
DROP POLICY IF EXISTS "Authenticated access to appointment_notes" ON public.appointment_notes;
CREATE POLICY "Authenticated users manage appointment_notes" ON public.appointment_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Appointment tags policies
DROP POLICY IF EXISTS "Authenticated access to appointment_tags" ON public.appointment_tags;
CREATE POLICY "Authenticated users manage appointment_tags" ON public.appointment_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Clients policies
DROP POLICY IF EXISTS "Authenticated access to clients" ON public.clients;
CREATE POLICY "Authenticated users manage clients" ON public.clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Appointments policies
DROP POLICY IF EXISTS "Authenticated access to appointments" ON public.appointments;
CREATE POLICY "Authenticated users manage appointments" ON public.appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Profiles policies - users can only access their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users manage own profile" ON public.profiles
  FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Security audit log - authenticated read access
DROP POLICY IF EXISTS "Authenticated read audit log" ON public.security_audit_log;
CREATE POLICY "Authenticated users read security_audit_log" ON public.security_audit_log
  FOR SELECT TO authenticated USING (true);

-- Rate limit log - system/service role only
DROP POLICY IF EXISTS "System only rate limit log" ON public.rate_limit_log;
DROP POLICY IF EXISTS "System functions access rate_limit_log" ON public.rate_limit_log;
CREATE POLICY "Service role manages rate_limit_log" ON public.rate_limit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Portal sessions - system/service role only
DROP POLICY IF EXISTS "System only portal sessions" ON public.project_portal_sessions;
DROP POLICY IF EXISTS "System functions access portal_sessions" ON public.project_portal_sessions;
DROP POLICY IF EXISTS "System only access to portal sessions" ON public.project_portal_sessions;
CREATE POLICY "Service role manages portal_sessions" ON public.project_portal_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Ensure form submissions has proper policies for public form access
DROP POLICY IF EXISTS "Public form submission insert only" ON public.form_submissions;
DROP POLICY IF EXISTS "Authenticated view form submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Authenticated manage form submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Authenticated delete form submissions" ON public.form_submissions;

CREATE POLICY "Public can submit forms" ON public.form_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authenticated manage form_submissions" ON public.form_submissions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure form templates has proper policies (Fixed syntax)
DROP POLICY IF EXISTS "Public read form templates" ON public.form_templates;
DROP POLICY IF EXISTS "Authenticated manage form templates" ON public.form_templates;
DROP POLICY IF EXISTS "Authenticated update form templates" ON public.form_templates;
DROP POLICY IF EXISTS "Authenticated delete form templates" ON public.form_templates;

CREATE POLICY "Anyone can read form_templates" ON public.form_templates
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated manage form_templates" ON public.form_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure project forms has proper policies (Fixed syntax)
DROP POLICY IF EXISTS "Public read project forms" ON public.project_forms;
DROP POLICY IF EXISTS "Authenticated manage project forms" ON public.project_forms;
DROP POLICY IF EXISTS "Authenticated update project forms" ON public.project_forms;
DROP POLICY IF EXISTS "Authenticated delete project forms" ON public.project_forms;

CREATE POLICY "Anyone can read project_forms" ON public.project_forms
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated manage project_forms" ON public.project_forms
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Clean up any remaining functions that might have issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = now();
  
  RETURN new;
END;
$$;

-- Ensure trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create missing indexes for performance (may resolve some warnings)
CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON public.project_tags (project_id);
CREATE INDEX IF NOT EXISTS idx_appointment_notes_appointment_id ON public.appointment_notes (appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_tags_appointment_id ON public.appointment_tags (appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_tags_project_tag_id ON public.appointment_tags (project_tag_id);
CREATE INDEX IF NOT EXISTS idx_clients_client_id ON public.clients (client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments (client_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON public.security_audit_log (event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_identifier ON public.rate_limit_log (identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_window_start ON public.rate_limit_log (window_start);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_expires_at ON public.project_portal_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_token ON public.project_portal_sessions (session_token);

-- Grant necessary permissions to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant service role permissions for system functions
GRANT ALL ON public.rate_limit_log TO service_role;
GRANT ALL ON public.project_portal_sessions TO service_role;
GRANT INSERT ON public.security_audit_log TO service_role;
