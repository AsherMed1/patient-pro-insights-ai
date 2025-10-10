-- Drop and recreate get_appointment_lead_association function to include DOB field
DROP FUNCTION IF EXISTS public.get_appointment_lead_association(text,text,text,text,text);

CREATE OR REPLACE FUNCTION public.get_appointment_lead_association(
  appointment_ghl_id text DEFAULT NULL::text, 
  appointment_phone text DEFAULT NULL::text, 
  appointment_email text DEFAULT NULL::text, 
  appointment_lead_name text DEFAULT NULL::text, 
  appointment_project_name text DEFAULT NULL::text
)
RETURNS TABLE(
  lead_id uuid, 
  contact_id text, 
  phone_number text, 
  email text, 
  lead_name text, 
  project_name text, 
  insurance_provider text, 
  insurance_plan text, 
  insurance_id text, 
  insurance_id_link text, 
  group_number text, 
  patient_intake_notes text,
  dob text,
  match_strategy text
)
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
      nl.dob::text,
      'ghl_id'::text as match_strategy
    FROM new_leads nl
    WHERE nl.contact_id = appointment_ghl_id
    LIMIT 1;
    
    IF FOUND THEN
      RETURN;
    END IF;
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
      nl.dob::text,
      'phone'::text as match_strategy
    FROM new_leads nl
    WHERE nl.phone_number = appointment_phone
    LIMIT 1;
    
    IF FOUND THEN
      RETURN;
    END IF;
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
      nl.dob::text,
      'email'::text as match_strategy
    FROM new_leads nl
    WHERE nl.email = appointment_email
    LIMIT 1;
    
    IF FOUND THEN
      RETURN;
    END IF;
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
      nl.dob::text,
      'name_project'::text as match_strategy
    FROM new_leads nl
    WHERE LOWER(TRIM(nl.lead_name)) = LOWER(TRIM(appointment_lead_name))
      AND nl.project_name = appointment_project_name
    LIMIT 1;
    
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  -- No match found
  RETURN;
END;
$function$;