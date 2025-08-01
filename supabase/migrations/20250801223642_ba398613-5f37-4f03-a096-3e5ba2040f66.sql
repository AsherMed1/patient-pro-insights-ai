-- Add structured fields to store categorized patient intake information
ALTER TABLE public.all_appointments 
ADD COLUMN IF NOT EXISTS parsed_insurance_info jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parsed_pathology_info jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parsed_contact_info jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parsed_demographics jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parsing_completed_at timestamp with time zone DEFAULT NULL;

-- Add structured fields to new_leads table as well
ALTER TABLE public.new_leads
ADD COLUMN IF NOT EXISTS parsed_insurance_info jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parsed_pathology_info jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parsed_contact_info jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parsed_demographics jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parsing_completed_at timestamp with time zone DEFAULT NULL;

-- Create function to automatically trigger AI parsing when notes are updated
CREATE OR REPLACE FUNCTION public.trigger_auto_ai_parsing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if patient_intake_notes changed and is not empty
  IF (TG_OP = 'INSERT' AND NEW.patient_intake_notes IS NOT NULL AND NEW.patient_intake_notes != '') 
     OR (TG_OP = 'UPDATE' AND NEW.patient_intake_notes IS DISTINCT FROM OLD.patient_intake_notes 
         AND NEW.patient_intake_notes IS NOT NULL AND NEW.patient_intake_notes != '') THEN
    
    -- Reset parsing fields to indicate new parsing is needed
    NEW.parsed_insurance_info := NULL;
    NEW.parsed_pathology_info := NULL;
    NEW.parsed_contact_info := NULL;
    NEW.parsed_demographics := NULL;
    NEW.parsing_completed_at := NULL;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic AI parsing
DROP TRIGGER IF EXISTS auto_ai_parsing_appointments ON public.all_appointments;
CREATE TRIGGER auto_ai_parsing_appointments
  BEFORE INSERT OR UPDATE ON public.all_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_ai_parsing();

DROP TRIGGER IF EXISTS auto_ai_parsing_leads ON public.new_leads;
CREATE TRIGGER auto_ai_parsing_leads
  BEFORE INSERT OR UPDATE ON public.new_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_ai_parsing();