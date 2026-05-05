
ALTER TABLE public.all_appointments
  ADD COLUMN IF NOT EXISTS time_preference TEXT,
  ADD COLUMN IF NOT EXISTS is_unscheduled BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.validate_time_preference()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.time_preference IS NOT NULL THEN
    NEW.time_preference := LOWER(TRIM(NEW.time_preference));
    IF NEW.time_preference NOT IN ('morning','afternoon','evening','no_preference') THEN
      RAISE EXCEPTION 'Invalid time_preference: %. Allowed: morning, afternoon, evening, no_preference', NEW.time_preference;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_time_preference_trigger ON public.all_appointments;
CREATE TRIGGER validate_time_preference_trigger
  BEFORE INSERT OR UPDATE OF time_preference ON public.all_appointments
  FOR EACH ROW EXECUTE FUNCTION public.validate_time_preference();
