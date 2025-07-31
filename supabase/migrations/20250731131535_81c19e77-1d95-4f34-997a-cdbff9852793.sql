-- Add ghl_id field to all_calls table
ALTER TABLE public.all_calls 
ADD COLUMN ghl_id text;