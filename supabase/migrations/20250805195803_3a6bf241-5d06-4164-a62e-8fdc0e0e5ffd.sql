-- Update all "Cancelled - Completed" statuses back to "Cancelled"
UPDATE public.all_appointments 
SET status = 'Cancelled', updated_at = now()
WHERE status = 'Cancelled - Completed';

-- Update all "No Show - Completed" statuses back to "No Show"
UPDATE public.all_appointments 
SET status = 'No Show', updated_at = now()
WHERE status = 'No Show - Completed';