-- Add ghl_appointment_id column to all_appointments table
ALTER TABLE public.all_appointments 
ADD COLUMN ghl_appointment_id TEXT;