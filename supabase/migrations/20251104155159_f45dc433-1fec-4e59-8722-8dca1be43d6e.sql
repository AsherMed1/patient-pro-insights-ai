-- Create EMR processing queue table
CREATE TABLE public.emr_processing_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.all_appointments(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  queued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  emr_system_name TEXT,
  emr_reference_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(appointment_id)
);

-- Add EMR columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS emr_system_name TEXT,
ADD COLUMN IF NOT EXISTS emr_integration_url TEXT,
ADD COLUMN IF NOT EXISTS emr_requires_manual_entry BOOLEAN DEFAULT true;

-- Enable RLS on emr_processing_queue
ALTER TABLE public.emr_processing_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emr_processing_queue
CREATE POLICY "Admins can manage all EMR queue items"
ON public.emr_processing_queue
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can manage all EMR queue items"
ON public.emr_processing_queue
FOR ALL
USING (has_role(auth.uid(), 'agent'))
WITH CHECK (has_role(auth.uid(), 'agent'));

CREATE POLICY "Project users see assigned project EMR queue"
ON public.emr_processing_queue
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'agent') OR 
  (has_role(auth.uid(), 'project_user') AND EXISTS (
    SELECT 1 FROM project_user_access pua
    JOIN projects p ON pua.project_id = p.id
    WHERE pua.user_id = auth.uid() 
    AND p.project_name = emr_processing_queue.project_name
  ))
);

CREATE POLICY "Project users can update assigned project EMR queue"
ON public.emr_processing_queue
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'agent') OR 
  (has_role(auth.uid(), 'project_user') AND EXISTS (
    SELECT 1 FROM project_user_access pua
    JOIN projects p ON pua.project_id = p.id
    WHERE pua.user_id = auth.uid() 
    AND p.project_name = emr_processing_queue.project_name
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'agent') OR 
  (has_role(auth.uid(), 'project_user') AND EXISTS (
    SELECT 1 FROM project_user_access pua
    JOIN projects p ON pua.project_id = p.id
    WHERE pua.user_id = auth.uid() 
    AND p.project_name = emr_processing_queue.project_name
  ))
);

-- Create trigger function to auto-queue confirmed appointments
CREATE OR REPLACE FUNCTION public.auto_queue_confirmed_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if status changed to 'confirmed' (case insensitive)
  IF NEW.status IS NOT NULL AND LOWER(TRIM(NEW.status)) = 'confirmed' THEN
    -- Insert into EMR queue if not already there
    INSERT INTO public.emr_processing_queue (
      appointment_id,
      project_name,
      status,
      queued_at
    ) VALUES (
      NEW.id,
      NEW.project_name,
      'pending',
      now()
    )
    ON CONFLICT (appointment_id) DO NOTHING;
    
    -- Log the queueing
    PERFORM public.log_audit_event(
      'emr_queue',
      'appointment_queued',
      'Appointment queued for EMR entry: ' || NEW.lead_name,
      'automation',
      jsonb_build_object(
        'appointment_id', NEW.id,
        'project_name', NEW.project_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on all_appointments
DROP TRIGGER IF EXISTS trigger_auto_queue_confirmed ON public.all_appointments;
CREATE TRIGGER trigger_auto_queue_confirmed
AFTER INSERT OR UPDATE OF status ON public.all_appointments
FOR EACH ROW
EXECUTE FUNCTION public.auto_queue_confirmed_appointment();

-- Add updated_at trigger for emr_processing_queue
DROP TRIGGER IF EXISTS update_emr_queue_updated_at ON public.emr_processing_queue;
CREATE TRIGGER update_emr_queue_updated_at
BEFORE UPDATE ON public.emr_processing_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_emr_queue_status ON public.emr_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_emr_queue_project ON public.emr_processing_queue(project_name);
CREATE INDEX IF NOT EXISTS idx_emr_queue_queued_at ON public.emr_processing_queue(queued_at);
CREATE INDEX IF NOT EXISTS idx_emr_queue_appointment_id ON public.emr_processing_queue(appointment_id);