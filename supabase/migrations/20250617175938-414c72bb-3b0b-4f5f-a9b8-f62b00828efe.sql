
-- Add color_indicator column to all_appointments table
ALTER TABLE all_appointments 
ADD COLUMN color_indicator TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN all_appointments.color_indicator IS 'Color indicator for appointment cards (yellow, green, red, or null)';
