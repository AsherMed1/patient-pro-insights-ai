
-- Fix the validate_project_access function to have an immutable search_path
DROP FUNCTION IF EXISTS public.validate_project_access(text);

CREATE OR REPLACE FUNCTION public.validate_project_access(project_name_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if project exists and is active
  RETURN EXISTS (
    SELECT 1 FROM public.projects 
    WHERE project_name = project_name_param AND active = true
  );
END;
$$;
