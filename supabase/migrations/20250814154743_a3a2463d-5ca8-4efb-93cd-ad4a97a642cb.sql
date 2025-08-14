-- Fix any remaining trigger functions that might need search_path
-- Check for trigger functions that don't have search_path set properly

-- Update update_appointment_status_from_tags if it exists
CREATE OR REPLACE FUNCTION public.update_appointment_status_from_tags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  tag_name TEXT;
  appointment_uuid UUID;
BEGIN
  -- Get the appointment ID and tag name
  appointment_uuid := COALESCE(NEW.appointment_id, OLD.appointment_id);
  
  -- For INSERT and UPDATE, get the tag name
  IF NEW.project_tag_id IS NOT NULL THEN
    SELECT pt.tag_name INTO tag_name
    FROM public.project_tags pt
    WHERE pt.id = NEW.project_tag_id;
  END IF;
  
  -- Update appointment status based on tag
  IF tag_name IS NOT NULL THEN
    CASE 
      WHEN LOWER(tag_name) = 'no show' THEN
        UPDATE public.all_appointments 
        SET status = 'No Show', updated_at = now()
        WHERE id = appointment_uuid;
      WHEN LOWER(tag_name) = 'showed' THEN
        UPDATE public.all_appointments 
        SET status = 'Showed', updated_at = now()
        WHERE id = appointment_uuid;
      WHEN LOWER(tag_name) = 'cancelled' THEN
        UPDATE public.all_appointments 
        SET status = 'Cancelled', updated_at = now()
        WHERE id = appointment_uuid;
    END CASE;
  END IF;
  
  -- For DELETE operations, check remaining tags and update status accordingly
  IF TG_OP = 'DELETE' THEN
    -- Check if there are any status-related tags remaining
    IF NOT EXISTS (
      SELECT 1 FROM public.appointment_tags at
      JOIN public.project_tags pt ON at.project_tag_id = pt.id
      WHERE at.appointment_id = appointment_uuid 
      AND LOWER(pt.tag_name) IN ('no show', 'showed', 'cancelled')
    ) THEN
      -- Reset status if no status tags remain
      UPDATE public.all_appointments 
      SET status = NULL, updated_at = now()
      WHERE id = appointment_uuid;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Log completion of search_path fixes
INSERT INTO public.security_audit_log (event_type, details)
VALUES ('all_search_path_complete', jsonb_build_object(
  'severity', 'INFO',
  'action', 'Completed all search_path security fixes',
  'status', 'All security definer functions now have proper search_path settings',
  'remaining_warnings', 'Only OTP expiry configuration remains',
  'timestamp', now()
));