-- Remove showed and confirmed columns from all_appointments table
-- This will permanently delete all data in these columns

ALTER TABLE public.all_appointments 
DROP COLUMN IF EXISTS showed;

ALTER TABLE public.all_appointments 
DROP COLUMN IF EXISTS confirmed;