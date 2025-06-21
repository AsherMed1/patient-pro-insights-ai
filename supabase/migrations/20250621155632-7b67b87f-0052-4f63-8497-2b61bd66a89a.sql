
-- Fix the validate_security_policies function to have an immutable search_path
DROP FUNCTION IF EXISTS public.validate_security_policies();

CREATE OR REPLACE FUNCTION public.validate_security_policies()
RETURNS TABLE(table_name text, has_rls boolean, public_access_count integer, authenticated_access_count integer, security_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::text,
    CASE WHEN t.rowsecurity THEN true ELSE false END as has_rls,
    COUNT(CASE WHEN p.roles && ARRAY['anon'] THEN 1 END)::integer as public_access_count,
    COUNT(CASE WHEN p.roles && ARRAY['authenticated'] THEN 1 END)::integer as authenticated_access_count,
    CASE 
      WHEN NOT t.rowsecurity THEN 'CRITICAL: RLS DISABLED'
      WHEN COUNT(CASE WHEN p.roles && ARRAY['anon'] THEN 1 END) > 0 
           AND t.tablename IN ('projects', 'new_leads', 'all_calls', 'all_appointments', 
                              'facebook_ad_spend', 'speed_to_lead_stats', 
                              'agent_performance_stats', 'agents', 'csv_import_history') 
      THEN 'HIGH RISK: PUBLIC ACCESS TO SENSITIVE DATA'
      ELSE 'SECURE'
    END as security_status
  FROM pg_tables t
  LEFT JOIN pg_policies p ON p.tablename = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('projects', 'new_leads', 'all_calls', 'all_appointments', 
                       'facebook_ad_spend', 'speed_to_lead_stats', 
                       'agent_performance_stats', 'agents', 'csv_import_history',
                       'form_templates', 'project_forms', 'form_submissions')
  GROUP BY t.tablename, t.rowsecurity
  ORDER BY t.tablename;
END;
$$;
