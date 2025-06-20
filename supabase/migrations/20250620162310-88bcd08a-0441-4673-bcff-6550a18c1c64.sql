
-- Add indexes for frequently queried columns to improve performance
CREATE INDEX IF NOT EXISTS idx_all_calls_project_name ON all_calls(project_name);
CREATE INDEX IF NOT EXISTS idx_all_calls_date ON all_calls(date);
CREATE INDEX IF NOT EXISTS idx_all_calls_agent ON all_calls(agent);
CREATE INDEX IF NOT EXISTS idx_all_calls_lead_name ON all_calls(lead_name);

CREATE INDEX IF NOT EXISTS idx_all_appointments_project_name ON all_appointments(project_name);
CREATE INDEX IF NOT EXISTS idx_all_appointments_date_created ON all_appointments(date_appointment_created);
CREATE INDEX IF NOT EXISTS idx_all_appointments_date_appointment ON all_appointments(date_of_appointment);
CREATE INDEX IF NOT EXISTS idx_all_appointments_agent ON all_appointments(agent);

CREATE INDEX IF NOT EXISTS idx_new_leads_project_name ON new_leads(project_name);
CREATE INDEX IF NOT EXISTS idx_new_leads_date ON new_leads(date);

CREATE INDEX IF NOT EXISTS idx_facebook_ad_spend_project_name ON facebook_ad_spend(project_name);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_spend_date ON facebook_ad_spend(date);

-- Create materialized view for project statistics to avoid expensive calculations
CREATE MATERIALIZED VIEW IF NOT EXISTS project_stats_view AS
SELECT 
    p.project_name,
    COALESCE(leads.count, 0) as leads_count,
    COALESCE(calls.count, 0) as calls_count,
    COALESCE(appointments.count, 0) as appointments_count,
    COALESCE(appointments.confirmed_count, 0) as confirmed_appointments_count,
    COALESCE(ad_spend.total_spend, 0) as ad_spend,
    calls.last_activity
FROM projects p
LEFT JOIN (
    SELECT project_name, COUNT(*) as count
    FROM new_leads 
    GROUP BY project_name
) leads ON p.project_name = leads.project_name
LEFT JOIN (
    SELECT project_name, COUNT(*) as count, MAX(call_datetime) as last_activity
    FROM all_calls 
    GROUP BY project_name
) calls ON p.project_name = calls.project_name
LEFT JOIN (
    SELECT 
        project_name, 
        COUNT(*) as count,
        COUNT(CASE WHEN confirmed = true OR status ILIKE 'confirmed' THEN 1 END) as confirmed_count
    FROM all_appointments 
    GROUP BY project_name
) appointments ON p.project_name = appointments.project_name
LEFT JOIN (
    SELECT project_name, SUM(spend::numeric) as total_spend
    FROM facebook_ad_spend 
    GROUP BY project_name
) ad_spend ON p.project_name = ad_spend.project_name;

-- Create unique index on the materialized view for faster refreshes
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_stats_view_project_name ON project_stats_view(project_name);

-- Create materialized view for agent performance statistics (fixed ambiguous column reference)
CREATE MATERIALIZED VIEW IF NOT EXISTS agent_performance_view AS
SELECT 
    ac.agent,
    COUNT(*) as total_dials_made,
    COUNT(CASE WHEN ac.status IN ('answered', 'connected', 'pickup', 'voicemail') THEN 1 END) as answered_calls_vm,
    COUNT(CASE WHEN ac.status = 'completed' AND ac.duration_seconds >= 40 THEN 1 END) as pickups_40_plus,
    COUNT(CASE WHEN ac.duration_seconds >= 120 THEN 1 END) as conversations_2_plus,
    COALESCE(appointments.booked_count, 0) as booked_appointments,
    ROUND(SUM(ac.duration_seconds) / 60.0, 2) as time_on_phone_minutes,
    CASE WHEN COUNT(*) > 0 THEN ROUND(AVG(ac.duration_seconds) / 60.0, 2) ELSE 0 END as avg_duration_per_call,
    COALESCE(appointments.shows, 0) as shows,
    COALESCE(appointments.no_shows, 0) as no_shows
FROM all_calls ac
LEFT JOIN (
    SELECT 
        agent,
        COUNT(*) as booked_count,
        COUNT(CASE WHEN showed = true THEN 1 END) as shows,
        COUNT(CASE WHEN showed = false THEN 1 END) as no_shows
    FROM all_appointments
    WHERE agent IS NOT NULL
    GROUP BY agent
) appointments ON ac.agent = appointments.agent
WHERE ac.agent IS NOT NULL
GROUP BY ac.agent, appointments.booked_count, appointments.shows, appointments.no_shows;

-- Create unique index on agent performance view
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_performance_view_agent ON agent_performance_view(agent);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_performance_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW project_stats_view;
    REFRESH MATERIALIZED VIEW agent_performance_view;
END;
$$;

-- Create a function to get project stats efficiently
CREATE OR REPLACE FUNCTION get_project_stats(project_filter text DEFAULT NULL)
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

-- Create a function to get filtered data efficiently with proper pagination
CREATE OR REPLACE FUNCTION get_dashboard_data(
    p_project_name text DEFAULT 'ALL',
    p_date_from date DEFAULT NULL,
    p_date_to date DEFAULT NULL,
    p_limit integer DEFAULT 1000
)
RETURNS TABLE (
    leads_count bigint,
    appointments_count bigint,
    calls_count bigint,
    ad_spend_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    leads_count_result bigint := 0;
    appointments_count_result bigint := 0;
    calls_count_result bigint := 0;
    ad_spend_result numeric := 0;
BEGIN
    -- Get leads count
    SELECT COUNT(*) INTO leads_count_result
    FROM new_leads
    WHERE (p_project_name = 'ALL' OR project_name = p_project_name)
    AND (p_date_from IS NULL OR date >= p_date_from)
    AND (p_date_to IS NULL OR date <= p_date_to);
    
    -- Get appointments count
    SELECT COUNT(*) INTO appointments_count_result
    FROM all_appointments
    WHERE (p_project_name = 'ALL' OR project_name = p_project_name)
    AND (p_date_from IS NULL OR date_appointment_created >= p_date_from)
    AND (p_date_to IS NULL OR date_appointment_created <= p_date_to);
    
    -- Get calls count
    SELECT COUNT(*) INTO calls_count_result
    FROM all_calls
    WHERE (p_project_name = 'ALL' OR project_name = p_project_name)
    AND (p_date_from IS NULL OR date >= p_date_from)
    AND (p_date_to IS NULL OR date <= p_date_to);
    
    -- Get ad spend total
    SELECT COALESCE(SUM(spend::numeric), 0) INTO ad_spend_result
    FROM facebook_ad_spend
    WHERE (p_project_name = 'ALL' OR project_name = p_project_name)
    AND (p_date_from IS NULL OR date >= p_date_from)
    AND (p_date_to IS NULL OR date <= p_date_to);
    
    RETURN QUERY SELECT leads_count_result, appointments_count_result, calls_count_result, ad_spend_result;
END;
$$;
