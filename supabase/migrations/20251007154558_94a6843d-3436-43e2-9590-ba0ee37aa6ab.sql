-- Move recently imported Premier Vascular appointments to The Vein & Vascular Institute
-- This updates appointments created in the last 10 minutes from Premier Vascular project

UPDATE public.all_appointments
SET 
  project_name = 'The Vein & Vascular Institute',
  updated_at = now()
WHERE 
  project_name = 'Premier Vascular'
  AND date_appointment_created >= CURRENT_DATE - INTERVAL '1 day'
  AND created_at >= now() - INTERVAL '10 minutes';