-- Fix security issue: Set search_path for the function to prevent security vulnerabilities
CREATE OR REPLACE FUNCTION public.sync_patient_intake_notes_v2()
RETURNS trigger AS $$
BEGIN
  -- Only sync on INSERT and only if we don't already have intake notes
  IF TG_OP = 'INSERT' AND (NEW.patient_intake_notes IS NULL OR NEW.patient_intake_notes = '') THEN
    -- Find matching lead and get intake notes (no recursion risk since we're only doing SELECT)
    SELECT patient_intake_notes INTO NEW.patient_intake_notes
    FROM public.new_leads 
    WHERE LOWER(TRIM(lead_name)) = LOWER(TRIM(NEW.lead_name))
      AND project_name = NEW.project_name
      AND patient_intake_notes IS NOT NULL
      AND patient_intake_notes != ''
    ORDER BY created_at DESC 
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public';