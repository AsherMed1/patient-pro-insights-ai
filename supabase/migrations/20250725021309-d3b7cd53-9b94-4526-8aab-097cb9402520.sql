-- Create private schema for internal views and functions
CREATE SCHEMA IF NOT EXISTS private;

-- Move existing materialized views to private schema
DROP MATERIALIZED VIEW IF EXISTS public.project_stats_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.agent_performance_view CASCADE;

-- Recreate project_stats_view in private schema
CREATE MATERIALIZED VIEW private.project_stats_view AS
SELECT 
    p.project_name,
    COALESCE(leads.count, 0) AS leads_count,
    COALESCE(calls.count, 0) AS calls_count,
    COALESCE(appointments.count, 0) AS appointments_count,
    COALESCE(appointments.confirmed_count, 0) AS confirmed_appointments_count,
    COALESCE(ad_spend.total_spend, 0) AS ad_spend,
    calls.last_activity
FROM projects p
LEFT JOIN (
    SELECT project_name, count(*) AS count
    FROM new_leads
    GROUP BY project_name
) leads ON p.project_name = leads.project_name
LEFT JOIN (
    SELECT project_name, count(*) AS count, max(call_datetime) AS last_activity
    FROM all_calls
    GROUP BY project_name
) calls ON p.project_name = calls.project_name
LEFT JOIN (
    SELECT 
        project_name, 
        count(*) AS count,
        count(CASE WHEN confirmed = true OR status ILIKE 'confirmed' THEN 1 END) AS confirmed_count
    FROM all_appointments
    GROUP BY project_name
) appointments ON p.project_name = appointments.project_name
LEFT JOIN (
    SELECT project_name, sum(spend::numeric) AS total_spend
    FROM facebook_ad_spend
    GROUP BY project_name
) ad_spend ON p.project_name = ad_spend.project_name;

-- Recreate agent_performance_view in private schema
CREATE MATERIALIZED VIEW private.agent_performance_view AS
SELECT 
    ac.agent,
    count(*) AS total_dials_made,
    count(CASE WHEN ac.status IN ('answered', 'connected', 'pickup', 'voicemail') THEN 1 END) AS answered_calls_vm,
    count(CASE WHEN ac.status = 'completed' AND ac.duration_seconds >= 40 THEN 1 END) AS pickups_40_plus,
    count(CASE WHEN ac.duration_seconds >= 120 THEN 1 END) AS conversations_2_plus,
    COALESCE(appointments.booked_count, 0) AS booked_appointments,
    round((sum(ac.duration_seconds)::numeric / 60.0), 2) AS time_on_phone_minutes,
    CASE 
        WHEN count(*) > 0 THEN round((avg(ac.duration_seconds) / 60.0), 2)
        ELSE 0
    END AS avg_duration_per_call,
    COALESCE(appointments.shows, 0) AS shows,
    COALESCE(appointments.no_shows, 0) AS no_shows
FROM all_calls ac
LEFT JOIN (
    SELECT 
        agent,
        count(*) AS booked_count,
        count(CASE WHEN showed = true THEN 1 END) AS shows,
        count(CASE WHEN showed = false THEN 1 END) AS no_shows
    FROM all_appointments
    WHERE agent IS NOT NULL
    GROUP BY agent
) appointments ON ac.agent = appointments.agent
WHERE ac.agent IS NOT NULL
GROUP BY ac.agent, appointments.booked_count, appointments.shows, appointments.no_shows;

-- Create indexes for better performance
CREATE UNIQUE INDEX idx_project_stats_view_project_name ON private.project_stats_view(project_name);
CREATE UNIQUE INDEX idx_agent_performance_view_agent ON private.agent_performance_view(agent);

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA private TO service_role;
GRANT SELECT ON private.project_stats_view TO service_role;
GRANT SELECT ON private.agent_performance_view TO service_role;

-- Update the refresh function to use private schema
CREATE OR REPLACE FUNCTION public.refresh_performance_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW private.project_stats_view;
    REFRESH MATERIALIZED VIEW private.agent_performance_view;
END;
$function$;

-- Update get_project_stats function to use private schema
CREATE OR REPLACE FUNCTION public.get_project_stats(project_filter text DEFAULT NULL)
RETURNS TABLE(
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
AS $function$
BEGIN
    IF project_filter IS NULL OR project_filter = 'ALL' THEN
        RETURN QUERY
        SELECT * FROM private.project_stats_view
        ORDER BY private.project_stats_view.project_name;
    ELSE
        RETURN QUERY
        SELECT * FROM private.project_stats_view
        WHERE private.project_stats_view.project_name = project_filter;
    END IF;
END;
$function$;