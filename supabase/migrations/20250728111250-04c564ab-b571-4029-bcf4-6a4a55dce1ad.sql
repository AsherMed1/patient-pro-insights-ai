-- Add contact_id field to new_leads table
ALTER TABLE public.new_leads 
ADD COLUMN contact_id TEXT;