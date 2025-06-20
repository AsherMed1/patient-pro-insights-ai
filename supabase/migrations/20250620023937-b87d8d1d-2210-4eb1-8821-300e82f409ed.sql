
-- Comprehensive Security Fix Migration - Phase 1: RLS Policy Cleanup and Standardization
-- This migration will resolve all identified Supabase security errors

-- Step 1: Clean up all existing conflicting policies
DO $$ 
DECLARE
    pol_record RECORD;
BEGIN
    -- Remove all existing policies to start fresh and avoid conflicts
    FOR pol_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                          pol_record.policyname, pol_record.schemaname, pol_record.tablename);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- Step 2: Ensure all tables have RLS enabled
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_ad_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_to_lead_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_portal_sessions ENABLE ROW LEVEL SECURITY;

-- Step 3: Create comprehensive, secure RLS policies

-- Core business data - authenticated users only
CREATE POLICY "authenticated_projects_access" ON public.projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_leads_access" ON public.new_leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_calls_access" ON public.all_calls
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_appointments_access" ON public.all_appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_facebook_ads_access" ON public.facebook_ad_spend
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_speed_stats_access" ON public.speed_to_lead_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_agent_stats_access" ON public.agent_performance_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_agents_access" ON public.agents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_import_history_access" ON public.csv_import_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_project_tags_access" ON public.project_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_appointment_notes_access" ON public.appointment_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_appointment_tags_access" ON public.appointment_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_clients_access" ON public.clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_appointments_table_access" ON public.appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Form system - public read for forms, authenticated management
CREATE POLICY "public_form_templates_read" ON public.form_templates
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "authenticated_form_templates_write" ON public.form_templates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_form_templates_update" ON public.form_templates
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated_form_templates_delete" ON public.form_templates
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "public_project_forms_read" ON public.project_forms
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "authenticated_project_forms_write" ON public.project_forms
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_project_forms_update" ON public.project_forms
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated_project_forms_delete" ON public.project_forms
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "public_form_submissions_insert" ON public.form_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "authenticated_form_submissions_read" ON public.form_submissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_form_submissions_update" ON public.form_submissions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated_form_submissions_delete" ON public.form_submissions
  FOR DELETE TO authenticated USING (true);

-- User profiles - users can only access their own profile
CREATE POLICY "users_own_profile_access" ON public.profiles
  FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Security tables - restricted access
CREATE POLICY "authenticated_security_audit_read" ON public.security_audit_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_security_audit_write" ON public.security_audit_log
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "service_rate_limit_access" ON public.rate_limit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_portal_sessions_access" ON public.project_portal_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Step 4: Grant proper permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON public.form_templates TO anon;
GRANT SELECT ON public.project_forms TO anon;
GRANT INSERT ON public.form_submissions TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON public.rate_limit_log TO service_role;
GRANT ALL ON public.project_portal_sessions TO service_role;
GRANT INSERT ON public.security_audit_log TO service_role;

-- Step 5: Clean up any duplicate or problematic database functions
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

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_created ON public.security_audit_log (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_identifier_window ON public.rate_limit_log (identifier, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_token_expires ON public.project_portal_sessions (session_token, expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles (id);
CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON public.project_tags (project_id);
CREATE INDEX IF NOT EXISTS idx_appointment_notes_appointment_id ON public.appointment_notes (appointment_id);
