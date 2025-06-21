
-- Fix the refresh_performance_views function to have an immutable search_path
DROP FUNCTION IF EXISTS public.refresh_performance_views();

CREATE OR REPLACE FUNCTION public.refresh_performance_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW project_stats_view;
    REFRESH MATERIALIZED VIEW agent_performance_view;
END;
$$;
