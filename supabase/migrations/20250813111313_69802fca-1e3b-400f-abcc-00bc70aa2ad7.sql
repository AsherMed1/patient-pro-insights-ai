-- Add was_ever_confirmed column to track if appointment was ever confirmed
ALTER TABLE public.all_appointments 
ADD COLUMN was_ever_confirmed boolean NOT NULL DEFAULT false;

-- Update existing records: set was_ever_confirmed = true for currently confirmed appointments
UPDATE public.all_appointments 
SET was_ever_confirmed = true 
WHERE LOWER(TRIM(status)) = 'confirmed';

-- Update existing records: assume appointments with final statuses were confirmed at some point
UPDATE public.all_appointments 
SET was_ever_confirmed = true 
WHERE LOWER(TRIM(status)) IN ('cancelled', 'canceled', 'no show', 'showed', 'won', 'procedure ordered');

-- Create function to automatically set was_ever_confirmed when status becomes confirmed
CREATE OR REPLACE FUNCTION public.handle_appointment_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If status is being set to 'confirmed', mark as was_ever_confirmed
  IF NEW.status IS NOT NULL AND LOWER(TRIM(NEW.status)) = 'confirmed' THEN
    NEW.was_ever_confirmed := true;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to automatically update was_ever_confirmed
CREATE TRIGGER trigger_appointment_confirmation
  BEFORE UPDATE ON public.all_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_appointment_confirmation();