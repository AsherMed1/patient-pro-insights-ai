-- Fix existing appointments with invalid statuses to "Confirmed"
UPDATE all_appointments 
SET status = 'Confirmed' 
WHERE LOWER(status) IN ('booked', 'null', 'undefined', '') 
   OR status IS NULL;