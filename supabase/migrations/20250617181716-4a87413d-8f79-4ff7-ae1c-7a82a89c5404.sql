
-- Add is_viewed column to track if appointment has been viewed
ALTER TABLE public.all_appointments 
ADD COLUMN is_viewed boolean DEFAULT false;

-- Add a comment to document the column
COMMENT ON COLUMN all_appointments.is_viewed IS 'Tracks whether the appointment has been viewed by a user (for NEW banner functionality)';
