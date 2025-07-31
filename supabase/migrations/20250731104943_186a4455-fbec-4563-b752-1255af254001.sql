-- Create a function to automatically update appointment status based on tags
CREATE OR REPLACE FUNCTION public.update_appointment_status_from_tags()
RETURNS TRIGGER AS $$
DECLARE
  tag_name_val TEXT;
  appointment_record RECORD;
BEGIN
  -- Get the tag name for the appointment tag that was inserted/updated
  SELECT pt.tag_name INTO tag_name_val
  FROM public.project_tags pt
  WHERE pt.id = NEW.project_tag_id;
  
  -- Get the appointment record
  SELECT * INTO appointment_record
  FROM public.all_appointments
  WHERE id = NEW.appointment_id;
  
  -- If tag is "no show" related, update the appointment status
  IF tag_name_val ILIKE '%no%show%' OR tag_name_val ILIKE '%noshow%' THEN
    UPDATE public.all_appointments
    SET 
      status = 'No Show',
      showed = false,
      updated_at = now()
    WHERE id = NEW.appointment_id;
    
    -- Log the automatic status update
    INSERT INTO public.security_audit_log (event_type, details)
    VALUES ('appointment_status_auto_update', jsonb_build_object(
      'appointment_id', NEW.appointment_id,
      'lead_name', appointment_record.lead_name,
      'tag_name', tag_name_val,
      'old_status', appointment_record.status,
      'new_status', 'No Show',
      'trigger_reason', 'no_show_tag_applied'
    ));
  
  -- If tag is "showed" related, update the appointment status
  ELSIF tag_name_val ILIKE '%showed%' OR tag_name_val ILIKE '%attended%' THEN
    UPDATE public.all_appointments
    SET 
      status = 'Showed',
      showed = true,
      updated_at = now()
    WHERE id = NEW.appointment_id;
    
    -- Log the automatic status update
    INSERT INTO public.security_audit_log (event_type, details)
    VALUES ('appointment_status_auto_update', jsonb_build_object(
      'appointment_id', NEW.appointment_id,
      'lead_name', appointment_record.lead_name,
      'tag_name', tag_name_val,
      'old_status', appointment_record.status,
      'new_status', 'Showed',
      'trigger_reason', 'showed_tag_applied'
    ));
  
  -- If tag is "cancelled" related, update the appointment status
  ELSIF tag_name_val ILIKE '%cancel%' THEN
    UPDATE public.all_appointments
    SET 
      status = 'Cancelled',
      updated_at = now()
    WHERE id = NEW.appointment_id;
    
    -- Log the automatic status update
    INSERT INTO public.security_audit_log (event_type, details)
    VALUES ('appointment_status_auto_update', jsonb_build_object(
      'appointment_id', NEW.appointment_id,
      'lead_name', appointment_record.lead_name,
      'tag_name', tag_name_val,
      'old_status', appointment_record.status,
      'new_status', 'Cancelled',
      'trigger_reason', 'cancelled_tag_applied'
    ));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically update appointment status when tags are added
CREATE OR REPLACE TRIGGER appointment_tag_status_update_trigger
  AFTER INSERT ON public.appointment_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_appointment_status_from_tags();

-- Also create a trigger for when tags are removed to potentially revert status
CREATE OR REPLACE FUNCTION public.handle_appointment_tag_removal()
RETURNS TRIGGER AS $$
DECLARE
  tag_name_val TEXT;
  remaining_status_tags INTEGER;
BEGIN
  -- Get the tag name that was removed
  SELECT pt.tag_name INTO tag_name_val
  FROM public.project_tags pt
  WHERE pt.id = OLD.project_tag_id;
  
  -- If a status-related tag was removed, check if there are other status tags
  IF tag_name_val ILIKE '%no%show%' OR tag_name_val ILIKE '%noshow%' 
     OR tag_name_val ILIKE '%showed%' OR tag_name_val ILIKE '%attended%'
     OR tag_name_val ILIKE '%cancel%' THEN
    
    -- Count remaining status-related tags
    SELECT COUNT(*) INTO remaining_status_tags
    FROM public.appointment_tags at
    JOIN public.project_tags pt ON at.project_tag_id = pt.id
    WHERE at.appointment_id = OLD.appointment_id
    AND (pt.tag_name ILIKE '%no%show%' OR pt.tag_name ILIKE '%noshow%' 
         OR pt.tag_name ILIKE '%showed%' OR pt.tag_name ILIKE '%attended%'
         OR pt.tag_name ILIKE '%cancel%');
    
    -- If no status tags remain, reset status to null for manual review
    IF remaining_status_tags = 0 THEN
      UPDATE public.all_appointments
      SET 
        status = null,
        showed = null,
        updated_at = now()
      WHERE id = OLD.appointment_id;
      
      -- Log the status reset
      INSERT INTO public.security_audit_log (event_type, details)
      VALUES ('appointment_status_auto_reset', jsonb_build_object(
        'appointment_id', OLD.appointment_id,
        'removed_tag', tag_name_val,
        'trigger_reason', 'status_tag_removed'
      ));
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for tag removal
CREATE OR REPLACE TRIGGER appointment_tag_removal_trigger
  AFTER DELETE ON public.appointment_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_appointment_tag_removal();