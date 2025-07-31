-- Create trigger to automatically sync patient intake notes for new appointments
CREATE TRIGGER sync_patient_intake_on_appointment
  AFTER INSERT OR UPDATE ON public.all_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_patient_intake_notes();