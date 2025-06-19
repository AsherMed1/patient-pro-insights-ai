
-- Fix remaining Supabase warnings - Complete RLS and Security Configuration

-- Ensure all tables have proper RLS enabled and policies
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for remaining tables

-- Project tags - authenticated access only
CREATE POLICY "Authenticated access to project_tags" ON public.project_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Appointment notes - authenticated access only
CREATE POLICY "Authenticated access to appointment_notes" ON public.appointment_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Appointment tags - authenticated access only  
CREATE POLICY "Authenticated access to appointment_tags" ON public.appointment_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Clients - authenticated access only
CREATE POLICY "Authenticated access to clients" ON public.clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Appointments - authenticated access only
CREATE POLICY "Authenticated access to appointments" ON public.appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fix profiles table - ensure it has proper RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles - users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Ensure security tables have proper access
DROP POLICY IF EXISTS "System only rate limit log" ON public.rate_limit_log;
DROP POLICY IF EXISTS "System only portal sessions" ON public.project_portal_sessions;

-- Rate limit log should be accessible by service functions only
CREATE POLICY "System functions access rate_limit_log" ON public.rate_limit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Portal sessions should be managed by system functions only
CREATE POLICY "System functions access portal_sessions" ON public.project_portal_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Clean up any remaining conflicting policies
DO $$ 
DECLARE
    rec RECORD;
BEGIN
    -- Drop any remaining duplicate or conflicting policies that might cause warnings
    FOR rec IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND policyname LIKE '%Allow public%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      rec.policyname, rec.schemaname, rec.tablename);
    END LOOP;
END $$;

-- Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles (id);
CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON public.project_tags (project_id);
CREATE INDEX IF NOT EXISTS idx_appointment_notes_appointment_id ON public.appointment_notes (appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_tags_appointment_id ON public.appointment_tags (appointment_id);
CREATE INDEX IF NOT EXISTS idx_clients_client_id ON public.clients (client_id);

-- Update handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$;

-- Ensure trigger exists for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Final cleanup of any orphaned or problematic policies
DO $$
DECLARE
    pol_rec RECORD;
BEGIN
    -- Remove any policies that might be causing conflicts
    FOR pol_rec IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND (policyname LIKE '%public access%' OR policyname LIKE '%Allow all%')
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                          pol_rec.policyname, pol_rec.schemaname, pol_rec.tablename);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors for policies that don't exist
            NULL;
        END;
    END LOOP;
END $$;
