-- Fix the security warning by ensuring search_path is immutable for the debug function
DROP FUNCTION IF EXISTS public.debug_password_verification(text, text);

CREATE OR REPLACE FUNCTION public.debug_password_verification(
  project_name_param text,
  password_param text
)
RETURNS TABLE(
  project_found boolean,
  has_password boolean,
  password_hash text,
  verification_result boolean,
  debug_info jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_record RECORD;
  verification_result_val boolean := false;
BEGIN
  -- Find project
  SELECT * INTO project_record
  FROM public.projects
  WHERE projects.project_name = project_name_param AND active = true;
  
  -- Test password verification if project found
  IF FOUND AND project_record.portal_password IS NOT NULL THEN
    verification_result_val := public.verify_password(password_param, project_record.portal_password);
  END IF;
  
  -- Return debug information
  RETURN QUERY SELECT 
    FOUND as project_found,
    (project_record.portal_password IS NOT NULL) as has_password,
    COALESCE(LEFT(project_record.portal_password, 20), 'NULL') as password_hash,
    verification_result_val as verification_result,
    jsonb_build_object(
      'project_name', project_name_param,
      'password_length', LENGTH(password_param),
      'hash_prefix', COALESCE(LEFT(project_record.portal_password, 7), 'NULL')
    ) as debug_info;
END;
$$;