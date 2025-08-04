-- Remove project portal session system since we're merging with regular auth
-- Clean up the project_portal_sessions table and related functions
DROP TABLE IF EXISTS public.project_portal_sessions CASCADE;

-- Remove the project portal session functions
DROP FUNCTION IF EXISTS public.create_secure_portal_session(text, text, inet, text) CASCADE;
DROP FUNCTION IF EXISTS public.verify_secure_portal_session(text, text, inet) CASCADE;
DROP FUNCTION IF EXISTS public.validate_secure_session(text, text, inet) CASCADE;
DROP FUNCTION IF EXISTS public.verify_portal_session(text, text, inet) CASCADE;
DROP FUNCTION IF EXISTS public.create_portal_session(text, text, inet, text) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_portal_sessions() CASCADE;

-- Remove portal password from projects table since we're using regular auth
ALTER TABLE public.projects DROP COLUMN IF EXISTS portal_password CASCADE;

-- Update RLS policies to ensure project users can only see their assigned project data
-- This policy ensures project users can only read projects they have access to
DROP POLICY IF EXISTS "Project users see assigned projects only" ON public.projects;
CREATE POLICY "Project users see assigned projects only" 
ON public.projects 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'agent') OR
  (public.has_role(auth.uid(), 'project_user') AND EXISTS (
    SELECT 1 FROM public.project_user_access 
    WHERE user_id = auth.uid() AND project_id = projects.id
  ))
);

-- Ensure project users can only see appointments for their assigned projects
DROP POLICY IF EXISTS "Project users see assigned project appointments" ON public.all_appointments;
CREATE POLICY "Project users see assigned project appointments" 
ON public.all_appointments 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'agent') OR
  (public.has_role(auth.uid(), 'project_user') AND EXISTS (
    SELECT 1 FROM public.project_user_access pua
    JOIN public.projects p ON pua.project_id = p.id
    WHERE pua.user_id = auth.uid() AND p.project_name = all_appointments.project_name
  ))
);

-- Ensure project users can only see leads for their assigned projects
DROP POLICY IF EXISTS "Project users see assigned project leads" ON public.new_leads;
CREATE POLICY "Project users see assigned project leads" 
ON public.new_leads 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'agent') OR
  (public.has_role(auth.uid(), 'project_user') AND EXISTS (
    SELECT 1 FROM public.project_user_access pua
    JOIN public.projects p ON pua.project_id = p.id
    WHERE pua.user_id = auth.uid() AND p.project_name = new_leads.project_name
  ))
);

-- Ensure project users can only see calls for their assigned projects
DROP POLICY IF EXISTS "Project users see assigned project calls" ON public.all_calls;
CREATE POLICY "Project users see assigned project calls" 
ON public.all_calls 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'agent') OR
  (public.has_role(auth.uid(), 'project_user') AND EXISTS (
    SELECT 1 FROM public.project_user_access pua
    JOIN public.projects p ON pua.project_id = p.id
    WHERE pua.user_id = auth.uid() AND p.project_name = all_calls.project_name
  ))
);