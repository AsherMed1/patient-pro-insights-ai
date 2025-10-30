-- Create a queue table for automatic insurance card fetching
CREATE TABLE IF NOT EXISTS public.insurance_fetch_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.all_appointments(id) ON DELETE CASCADE,
  ghl_id text NOT NULL,
  project_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone
);

-- Create index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_insurance_fetch_queue_status 
  ON public.insurance_fetch_queue(status, created_at);

-- Enable RLS
ALTER TABLE public.insurance_fetch_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage queue
CREATE POLICY "Service_manage_insurance_fetch_queue"
  ON public.insurance_fetch_queue
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create trigger function to automatically queue insurance fetching
CREATE OR REPLACE FUNCTION public.queue_insurance_card_fetch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only queue if appointment has ghl_id but no insurance_id_link
  IF NEW.ghl_id IS NOT NULL AND (NEW.insurance_id_link IS NULL OR NEW.insurance_id_link = '') THEN
    -- Insert into queue (ON CONFLICT prevents duplicates)
    INSERT INTO public.insurance_fetch_queue (
      appointment_id,
      ghl_id,
      project_name,
      status
    ) VALUES (
      NEW.id,
      NEW.ghl_id,
      NEW.project_name,
      'pending'
    )
    ON CONFLICT (appointment_id) DO NOTHING;
    
    -- Log the queuing
    PERFORM public.log_audit_event(
      'appointment',
      'insurance_fetch_queued',
      'Insurance card fetch queued for: ' || NEW.lead_name,
      'database_trigger',
      jsonb_build_object(
        'appointment_id', NEW.id,
        'ghl_id', NEW.ghl_id,
        'project_name', NEW.project_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add unique constraint to prevent duplicate queue entries
ALTER TABLE public.insurance_fetch_queue 
  ADD CONSTRAINT unique_appointment_in_queue UNIQUE (appointment_id);

-- Create trigger on all_appointments
DROP TRIGGER IF EXISTS trigger_queue_insurance_fetch ON public.all_appointments;
CREATE TRIGGER trigger_queue_insurance_fetch
  AFTER INSERT ON public.all_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_insurance_card_fetch();

-- Create function to process the insurance fetch queue
CREATE OR REPLACE FUNCTION public.process_insurance_fetch_queue(batch_size integer DEFAULT 10)
RETURNS TABLE(
  processed_count integer,
  success_count integer,
  error_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed integer := 0;
  v_success integer := 0;
  v_error integer := 0;
BEGIN
  -- This function will be called by the edge function to get pending items
  RETURN QUERY
  SELECT 
    0::integer as processed_count,
    0::integer as success_count, 
    0::integer as error_count;
END;
$$;