
-- Add appointmentID column to the all_appointments table
ALTER TABLE public.all_appointments 
ADD COLUMN appointment_id TEXT;

-- Add index for better performance when querying by appointment_id
CREATE INDEX idx_all_appointments_appointment_id ON public.all_appointments(appointment_id);
