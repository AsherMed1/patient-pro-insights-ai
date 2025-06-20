
-- Fix the calculate_speed_to_lead function to have a secure search_path
CREATE OR REPLACE FUNCTION public.calculate_speed_to_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.date_time_in IS NOT NULL AND NEW.date_time_of_first_call IS NOT NULL THEN
    NEW.speed_to_lead_time_min := EXTRACT(EPOCH FROM (NEW.date_time_of_first_call - NEW.date_time_in)) / 60;
  END IF;
  RETURN NEW;
END;
$function$
