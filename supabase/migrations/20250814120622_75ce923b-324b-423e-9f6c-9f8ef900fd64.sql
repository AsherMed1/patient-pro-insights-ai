-- Add internal_process_complete column to track internal process completion
ALTER TABLE public.all_appointments 
ADD COLUMN internal_process_complete boolean NOT NULL DEFAULT false;