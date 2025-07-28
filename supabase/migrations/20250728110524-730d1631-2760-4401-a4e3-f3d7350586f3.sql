-- Add patient intake notes field to new_leads table
ALTER TABLE public.new_leads 
ADD COLUMN patient_intake_notes TEXT;