-- Remove showed and confirmed columns from all_appointments table
-- Using CASCADE to handle dependent objects like materialized views

ALTER TABLE public.all_appointments 
DROP COLUMN IF EXISTS showed CASCADE;

ALTER TABLE public.all_appointments 
DROP COLUMN IF EXISTS confirmed CASCADE;