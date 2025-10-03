-- Function to sync lead data (DOB, insurance, intake notes) to appointments
CREATE OR REPLACE FUNCTION public.sync_lead_data_to_appointments()
RETURNS TABLE(
  appointment_id uuid,
  lead_name text,
  synced_count integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  -- Update appointments with matching lead data
  WITH matched_leads AS (
    SELECT DISTINCT ON (a.id)
      a.id as appt_id,
      l.dob,
      l.insurance_provider,
      l.insurance_plan,
      l.insurance_id,
      l.insurance_id_link,
      l.patient_intake_notes
    FROM public.all_appointments a
    INNER JOIN public.new_leads l ON (
      -- Match by GHL ID first (highest priority)
      (a.ghl_id IS NOT NULL AND l.contact_id = a.ghl_id)
      OR 
      -- Then by phone
      (a.lead_phone_number IS NOT NULL AND l.phone_number = a.lead_phone_number)
      OR
      -- Finally by name + project
      (LOWER(TRIM(a.lead_name)) = LOWER(TRIM(l.lead_name)) AND a.project_name = l.project_name)
    )
    WHERE (
      -- Only update if at least one field is missing
      a.dob IS NULL OR
      a.detected_insurance_provider IS NULL OR
      a.detected_insurance_plan IS NULL OR
      a.detected_insurance_id IS NULL OR
      a.patient_intake_notes IS NULL OR
      a.patient_intake_notes = ''
    )
    ORDER BY a.id, l.created_at DESC
  )
  UPDATE public.all_appointments a
  SET 
    dob = COALESCE(a.dob, ml.dob),
    detected_insurance_provider = COALESCE(a.detected_insurance_provider, ml.insurance_provider),
    detected_insurance_plan = COALESCE(a.detected_insurance_plan, ml.insurance_plan),
    detected_insurance_id = COALESCE(a.detected_insurance_id, ml.insurance_id),
    insurance_id_link = COALESCE(a.insurance_id_link, ml.insurance_id_link),
    patient_intake_notes = CASE 
      WHEN (a.patient_intake_notes IS NULL OR a.patient_intake_notes = '') 
      THEN ml.patient_intake_notes 
      ELSE a.patient_intake_notes 
    END,
    updated_at = now()
  FROM matched_leads ml
  WHERE a.id = ml.appt_id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN QUERY
  SELECT 
    NULL::uuid as appointment_id,
    'Sync completed'::text as lead_name,
    updated_count as synced_count;
END;
$$;