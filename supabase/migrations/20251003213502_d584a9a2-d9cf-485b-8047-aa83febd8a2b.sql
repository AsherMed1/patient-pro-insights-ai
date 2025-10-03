-- Drop the old function
DROP FUNCTION IF EXISTS public.sync_lead_data_to_appointments();

-- Create an optimized version that works in batches
CREATE OR REPLACE FUNCTION public.sync_lead_data_to_appointments(
  batch_size integer DEFAULT 100
)
RETURNS TABLE(
  total_updated integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '60s'
AS $$
DECLARE
  updated_count integer := 0;
  batch_count integer := 0;
BEGIN
  -- Update appointments in batches to avoid timeout
  LOOP
    WITH batch_matches AS (
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
        a.dob IS NULL OR
        a.detected_insurance_provider IS NULL OR
        a.patient_intake_notes IS NULL OR
        a.patient_intake_notes = ''
      )
      ORDER BY a.id, l.created_at DESC
      LIMIT batch_size
    ),
    updated_batch AS (
      UPDATE public.all_appointments a
      SET 
        dob = COALESCE(a.dob, bm.dob),
        detected_insurance_provider = COALESCE(a.detected_insurance_provider, bm.insurance_provider),
        detected_insurance_plan = COALESCE(a.detected_insurance_plan, bm.insurance_plan),
        detected_insurance_id = COALESCE(a.detected_insurance_id, bm.insurance_id),
        insurance_id_link = COALESCE(a.insurance_id_link, bm.insurance_id_link),
        patient_intake_notes = CASE 
          WHEN (a.patient_intake_notes IS NULL OR a.patient_intake_notes = '') 
          THEN bm.patient_intake_notes 
          ELSE a.patient_intake_notes 
        END,
        updated_at = now()
      FROM batch_matches bm
      WHERE a.id = bm.appt_id
      RETURNING a.id
    )
    SELECT COUNT(*) INTO batch_count FROM updated_batch;
    
    updated_count := updated_count + batch_count;
    
    -- Exit loop if no more records were updated
    EXIT WHEN batch_count = 0;
  END LOOP;
  
  RETURN QUERY SELECT updated_count;
END;
$$;