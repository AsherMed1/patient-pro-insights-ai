-- Add insurance detection fields to all_appointments table
ALTER TABLE public.all_appointments 
ADD COLUMN detected_insurance_provider text,
ADD COLUMN detected_insurance_plan text,
ADD COLUMN detected_insurance_id text,
ADD COLUMN insurance_detection_confidence numeric DEFAULT 0;

-- Add index for better performance on insurance queries
CREATE INDEX idx_all_appointments_insurance_provider ON public.all_appointments(detected_insurance_provider);

-- Update the format-intake-ai edge function trigger to also process insurance
-- This will be handled in the edge function update

-- Add comment for documentation
COMMENT ON COLUMN public.all_appointments.detected_insurance_provider IS 'AI-detected insurance provider from patient intake notes';
COMMENT ON COLUMN public.all_appointments.detected_insurance_plan IS 'AI-detected insurance plan details from patient intake notes';
COMMENT ON COLUMN public.all_appointments.detected_insurance_id IS 'AI-detected insurance ID/member number from patient intake notes';
COMMENT ON COLUMN public.all_appointments.insurance_detection_confidence IS 'Confidence score (0-1) for AI insurance detection accuracy';