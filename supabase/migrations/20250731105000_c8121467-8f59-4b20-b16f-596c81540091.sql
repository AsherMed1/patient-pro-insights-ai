-- Create function to update appointment status based on tags
CREATE OR REPLACE FUNCTION update_appointment_status_from_tags()
RETURNS TRIGGER AS $$
DECLARE
  tag_name TEXT;
  appointment_uuid UUID;
BEGIN
  -- Get the appointment ID and tag name
  appointment_uuid := COALESCE(NEW.appointment_id, OLD.appointment_id);
  
  -- For INSERT and UPDATE, get the tag name
  IF NEW.project_tag_id IS NOT NULL THEN
    SELECT pt.tag_name INTO tag_name
    FROM project_tags pt
    WHERE pt.id = NEW.project_tag_id;
  END IF;
  
  -- Update appointment status based on tag
  IF tag_name IS NOT NULL THEN
    CASE 
      WHEN LOWER(tag_name) = 'no show' THEN
        UPDATE all_appointments 
        SET status = 'No Show', updated_at = now()
        WHERE id = appointment_uuid;
      WHEN LOWER(tag_name) = 'showed' THEN
        UPDATE all_appointments 
        SET status = 'Showed', updated_at = now()
        WHERE id = appointment_uuid;
      WHEN LOWER(tag_name) = 'cancelled' THEN
        UPDATE all_appointments 
        SET status = 'Cancelled', updated_at = now()
        WHERE id = appointment_uuid;
    END CASE;
  END IF;
  
  -- For DELETE operations, check remaining tags and update status accordingly
  IF TG_OP = 'DELETE' THEN
    -- Check if there are any status-related tags remaining
    IF NOT EXISTS (
      SELECT 1 FROM appointment_tags at
      JOIN project_tags pt ON at.project_tag_id = pt.id
      WHERE at.appointment_id = appointment_uuid 
      AND LOWER(pt.tag_name) IN ('no show', 'showed', 'cancelled')
    ) THEN
      -- Reset status if no status tags remain
      UPDATE all_appointments 
      SET status = NULL, updated_at = now()
      WHERE id = appointment_uuid;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for appointment_tags
DROP TRIGGER IF EXISTS appointment_tags_status_trigger ON appointment_tags;
CREATE TRIGGER appointment_tags_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON appointment_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_status_from_tags();

-- Create some default project tags for status tracking
INSERT INTO project_tags (project_id, tag_name, tag_color, tag_description)
SELECT 
  p.id,
  'No Show',
  '#EF4444',
  'Patient did not show up for appointment'
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_tags pt 
  WHERE pt.project_id = p.id AND pt.tag_name = 'No Show'
);

INSERT INTO project_tags (project_id, tag_name, tag_color, tag_description)
SELECT 
  p.id,
  'Showed',
  '#10B981',
  'Patient showed up for appointment'
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_tags pt 
  WHERE pt.project_id = p.id AND pt.tag_name = 'Showed'
);

INSERT INTO project_tags (project_id, tag_name, tag_color, tag_description)
SELECT 
  p.id,
  'Cancelled',
  '#F59E0B',
  'Appointment was cancelled'
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_tags pt 
  WHERE pt.project_id = p.id AND pt.tag_name = 'Cancelled'
);