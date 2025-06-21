
-- Fix the get_project_stats function to have an immutable search_path
DROP FUNCTION IF EXISTS public.get_project_stats(text);

CREATE OR REPLACE FUNCTION public.get_project_stats(project_filter text DEFAULT NULL)
RETURNS TABLE (
    project_name text,
    leads_count bigint,
    calls_count bigint,
    appointments_count bigint,
    confirmed_appointments_count bigint,
    ad_spend numeric,
    last_activity timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF project_filter IS NULL OR project_filter = 'ALL' THEN
        RETURN QUERY
        SELECT * FROM project_stats_view
        ORDER BY project_stats_view.project_name;
    ELSE
        RETURN QUERY
        SELECT * FROM project_stats_view
        WHERE project_stats_view.project_name = project_filter;
    END IF;
END;
$$;
