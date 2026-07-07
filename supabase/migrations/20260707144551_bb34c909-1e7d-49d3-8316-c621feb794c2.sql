ALTER TABLE public.all_appointments 
  DROP CONSTRAINT IF EXISTS unique_appointment_ghl_datetime;

DROP INDEX IF EXISTS public.unique_appointment_ghl_datetime_active;

CREATE UNIQUE INDEX unique_appointment_ghl_datetime_active
ON public.all_appointments (ghl_id, date_of_appointment, requested_time)
WHERE ghl_id IS NOT NULL
  AND date_of_appointment IS NOT NULL
  AND requested_time IS NOT NULL
  AND COALESCE(is_superseded, false) = false
  AND (status IS NULL OR LOWER(TRIM(status)) NOT IN (
    'cancelled','canceled','no show','noshow','no-show',
    'rescheduled','do not call','donotcall','oon','welcome call'
  ));