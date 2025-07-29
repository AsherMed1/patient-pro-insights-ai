-- Add ai_summary column to all_appointments table
ALTER TABLE public.all_appointments 
ADD COLUMN ai_summary text;