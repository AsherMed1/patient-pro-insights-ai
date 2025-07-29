-- Add ai_summary column to new_leads table for automatic intake formatting
ALTER TABLE public.new_leads 
ADD COLUMN ai_summary text;