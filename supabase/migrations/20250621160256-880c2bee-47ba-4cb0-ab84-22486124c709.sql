
-- Fix materialized view access without RLS (since RLS isn't supported on materialized views)
-- Revoke public access from anon users
REVOKE SELECT ON public.project_stats_view FROM anon;

-- Revoke default public access
REVOKE SELECT ON public.project_stats_view FROM public;

-- Ensure only authenticated users have access
GRANT SELECT ON public.project_stats_view TO authenticated;

-- Also apply the same restrictions to agent_performance_view if it exists
REVOKE SELECT ON public.agent_performance_view FROM anon;
REVOKE SELECT ON public.agent_performance_view FROM public;
GRANT SELECT ON public.agent_performance_view TO authenticated;
