
-- Double-check and reinforce materialized view security
-- First, let's ensure we completely lock down the materialized views

-- Remove all existing permissions on project_stats_view
REVOKE ALL ON public.project_stats_view FROM PUBLIC;
REVOKE ALL ON public.project_stats_view FROM anon;
REVOKE ALL ON public.project_stats_view FROM authenticated;

-- Grant only SELECT to authenticated users
GRANT SELECT ON public.project_stats_view TO authenticated;

-- Do the same for agent_performance_view
REVOKE ALL ON public.agent_performance_view FROM PUBLIC;
REVOKE ALL ON public.agent_performance_view FROM anon; 
REVOKE ALL ON public.agent_performance_view FROM authenticated;

-- Grant only SELECT to authenticated users
GRANT SELECT ON public.agent_performance_view TO authenticated;

-- Also check if there are any default privileges that might be interfering
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;
