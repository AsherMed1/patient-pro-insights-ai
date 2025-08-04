-- Step 1: Drop ALL triggers related to patient intake notes to prevent recursion
DROP TRIGGER IF EXISTS sync_patient_intake_notes_trigger ON public.all_appointments;

-- Step 2: Drop the problematic function completely  
DROP FUNCTION IF EXISTS public.sync_patient_intake_notes();
DROP FUNCTION IF EXISTS public.sync_patient_intake_notes_safe();

-- Step 3: Bulk update procedure_ordered for existing appointments to reflect automatic logic
-- Set procedure_ordered = false for cancelled and no show appointments
UPDATE public.all_appointments 
SET 
  procedure_ordered = false,
  updated_at = now()
WHERE procedure_ordered IS NULL 
  AND (
    LOWER(TRIM(status)) IN ('cancelled', 'canceled', 'no show', 'noshow', 'no-show')
  );

-- Set procedure_ordered = true for showed and won appointments  
UPDATE public.all_appointments 
SET 
  procedure_ordered = true,
  updated_at = now()
WHERE procedure_ordered IS NULL 
  AND (
    LOWER(TRIM(status)) IN ('showed', 'won', 'completed', 'attended')
  );

-- Step 4: Log the bulk update operation
INSERT INTO public.security_audit_log (event_type, details)
VALUES ('bulk_procedure_ordered_update', jsonb_build_object(
  'operation', 'bulk_update_procedure_ordered',
  'logic_applied', 'cancelled/no_show = false, showed/won = true',
  'updated_at', now(),
  'recursion_fix_applied', true
));

-- Step 5: Re-create a SIMPLE sync function that won't cause recursion
CREATE OR REPLACE FUNCTION public.sync_patient_intake_notes_simple()
RETURNS trigger AS $$
BEGIN
  -- Only sync if we don't already have intake notes
  IF NEW.patient_intake_notes IS NULL OR NEW.patient_intake_notes = '' THEN
    -- Find matching lead and get intake notes
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger with the simple function
CREATE TRIGGER sync_patient_intake_notes_trigger
  BEFORE INSERT ON public.all_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_patient_intake_notes_simple();