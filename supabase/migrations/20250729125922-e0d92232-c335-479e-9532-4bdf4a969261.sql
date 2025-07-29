-- Add patient_intake_notes field to all_appointments table
ALTER TABLE public.all_appointments 
ADD COLUMN patient_intake_notes TEXT;