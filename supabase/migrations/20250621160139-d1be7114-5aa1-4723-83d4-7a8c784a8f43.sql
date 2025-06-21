
-- Fix the get_dashboard_data function to have an immutable search_path
DROP FUNCTION IF EXISTS public.get_dashboard_data(text, date, date, integer);

CREATE OR REPLACE FUNCTION public.get_dashboard_data(
    p_project_name text DEFAULT 'ALL'::text, 
    p_date_from date DEFAULT NULL::date, 
    p_date_to date DEFAULT NULL::date, 
    p_limit integer DEFAULT 1000
)
RETURNS TABLE(leads_count bigint, appointments_count bigint, calls_count bigint, ad_spend_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
