-- Add insurance_id_link column to new_leads table
ALTER TABLE public.new_leads 
ADD COLUMN insurance_id_link text;

-- Add insurance_id_link column to all_appointments table  
ALTER TABLE public.all_appointments 
ADD COLUMN insurance_id_link text;