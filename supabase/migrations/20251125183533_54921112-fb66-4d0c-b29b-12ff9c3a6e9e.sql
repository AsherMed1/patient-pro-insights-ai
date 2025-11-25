-- Add ghl_location_id column to all_appointments table
ALTER TABLE public.all_appointments 
ADD COLUMN IF NOT EXISTS ghl_location_id text;