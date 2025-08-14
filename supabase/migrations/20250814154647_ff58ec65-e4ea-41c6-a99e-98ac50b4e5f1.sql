-- Fix any remaining search_path issues for security definer functions

-- Update functions that might still have search_path issues
-- Check debug_password_verification function
CREATE OR REPLACE FUNCTION public.debug_password_verification(project_name_param text, password_param text)
RETURNS TABLE(project_found boolean, has_password boolean, password_hash text, verification_result boolean, debug_info jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Update get_appointment_lead_association function  
CREATE OR REPLACE FUNCTION public.get_appointment_lead_association(appointment_ghl_id text DEFAULT NULL::text, appointment_phone text DEFAULT NULL::text, appointment_email text DEFAULT NULL::text, appointment_lead_name text DEFAULT NULL::text, appointment_project_name text DEFAULT NULL::text)
RETURNS TABLE(lead_id uuid, contact_id text, phone_number text, email text, lead_name text, project_name text, insurance_provider text, insurance_plan text, insurance_id text, insurance_id_link text, group_number text, patient_intake_notes text, match_strategy text)
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Strategy 1: GHL ID match (highest priority)
  IF appointment_ghl_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      nl.id,
      nl.contact_id,
      nl.phone_number,
      nl.email,
      nl.lead_name,
      nl.project_name,
      nl.insurance_provider,
      nl.insurance_plan,
      nl.insurance_id,
      nl.insurance_id_link,
      nl.group_number,
      nl.patient_intake_notes,
      'ghl_id'::text as match_strategy
    FROM public.new_leads nl
    WHERE nl.contact_id = appointment_ghl_id
    ORDER BY nl.created_at DESC
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
  END IF;
  
  -- Strategy 2: Phone number match
  IF appointment_phone IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      nl.id,
      nl.contact_id,
      nl.phone_number,
      nl.email,
      nl.lead_name,
      nl.project_name,
      nl.insurance_provider,
      nl.insurance_plan,
      nl.insurance_id,
      nl.insurance_id_link,
      nl.group_number,
      nl.patient_intake_notes,
      'phone'::text as match_strategy
    FROM public.new_leads nl
    WHERE nl.phone_number = appointment_phone
    ORDER BY nl.created_at DESC
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
  END IF;
  
  -- Strategy 3: Email match
  IF appointment_email IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      nl.id,
      nl.contact_id,
      nl.phone_number,
      nl.email,
      nl.lead_name,
      nl.project_name,
      nl.insurance_provider,
      nl.insurance_plan,
      nl.insurance_id,
      nl.insurance_id_link,
      nl.group_number,
      nl.patient_intake_notes,
      'email'::text as match_strategy
    FROM public.new_leads nl
    WHERE nl.email = appointment_email
    ORDER BY nl.created_at DESC
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
  END IF;
  
  -- Strategy 4: Name + Project match (lowest priority)
  IF appointment_lead_name IS NOT NULL AND appointment_project_name IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      nl.id,
      nl.contact_id,
      nl.phone_number,
      nl.email,
      nl.lead_name,
      nl.project_name,
      nl.insurance_provider,
      nl.insurance_plan,
      nl.insurance_id,
      nl.insurance_id_link,
      nl.group_number,
      nl.patient_intake_notes,
      'name_project'::text as match_strategy
    FROM public.new_leads nl
    WHERE LOWER(TRIM(nl.lead_name)) = LOWER(TRIM(appointment_lead_name))
      AND nl.project_name = appointment_project_name
    ORDER BY nl.created_at DESC
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
  END IF;
  
  -- No match found
  RETURN;
END;
$function$;

-- Update get_dashboard_data function
CREATE OR REPLACE FUNCTION public.get_dashboard_data(p_project_name text DEFAULT 'ALL'::text, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_limit integer DEFAULT 1000)
RETURNS TABLE(leads_count bigint, appointments_count bigint, calls_count bigint, ad_spend_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    leads_count_result bigint := 0;
    appointments_count_result bigint := 0;
    calls_count_result bigint := 0;
    ad_spend_result numeric := 0;
BEGIN
    -- Get leads count
    SELECT COUNT(*) INTO leads_count_result
    FROM public.new_leads
    WHERE (p_project_name = 'ALL' OR project_name = p_project_name)
    AND (p_date_from IS NULL OR date >= p_date_from)
    AND (p_date_to IS NULL OR date <= p_date_to);
    
    -- Get appointments count
    SELECT COUNT(*) INTO appointments_count_result
    FROM public.all_appointments
    WHERE (p_project_name = 'ALL' OR project_name = p_project_name)
    AND (p_date_from IS NULL OR date_appointment_created >= p_date_from)
    AND (p_date_to IS NULL OR date_appointment_created <= p_date_to);
    
    -- Get calls count
    SELECT COUNT(*) INTO calls_count_result
    FROM public.all_calls
    WHERE (p_project_name = 'ALL' OR project_name = p_project_name)
    AND (p_date_from IS NULL OR date >= p_date_from)
    AND (p_date_to IS NULL OR date <= p_date_to);
    
    -- Get ad spend total
    SELECT COALESCE(SUM(spend::numeric), 0) INTO ad_spend_result
    FROM public.facebook_ad_spend
    WHERE (p_project_name = 'ALL' OR project_name = p_project_name)
    AND (p_date_from IS NULL OR date >= p_date_from)
    AND (p_date_to IS NULL OR date <= p_date_to);
    
    RETURN QUERY SELECT leads_count_result, appointments_count_result, calls_count_result, ad_spend_result;
END;
$function$;

-- Update get_project_stats function
CREATE OR REPLACE FUNCTION public.get_project_stats(project_filter text DEFAULT NULL::text)
RETURNS TABLE(project_name text, leads_count bigint, calls_count bigint, appointments_count bigint, confirmed_appointments_count bigint, ad_spend numeric, last_activity timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Log that we've fixed all search_path issues
INSERT INTO public.security_audit_log (event_type, details)
VALUES ('final_search_path_fixes', jsonb_build_object(
  'severity', 'INFO',
  'action', 'Applied search_path fixes to all remaining security definer functions',
  'fixed_functions', ARRAY[
    'debug_password_verification',
    'get_appointment_lead_association', 
    'get_dashboard_data',
    'get_project_stats'
  ],
  'search_path_standard', 'SET search_path = public',
  'timestamp', now()
));