-- Create appointment_reschedules table
CREATE TABLE appointment_reschedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES all_appointments(id) ON DELETE CASCADE,
  
  -- Original appointment details
  original_date DATE,
  original_time TIME,
  
  -- New requested appointment details
  new_date DATE NOT NULL,
  new_time TIME,
  
  -- Tracking fields
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Additional context
  notes TEXT,
  project_name TEXT NOT NULL,
  lead_name TEXT NOT NULL,
  lead_phone TEXT,
  lead_email TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_reschedules_appointment ON appointment_reschedules(appointment_id);
CREATE INDEX idx_reschedules_processed ON appointment_reschedules(processed);
CREATE INDEX idx_reschedules_project ON appointment_reschedules(project_name);
CREATE INDEX idx_reschedules_requested_at ON appointment_reschedules(requested_at DESC);

-- Enable RLS
ALTER TABLE appointment_reschedules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reschedules for projects they have access to
CREATE POLICY "Users can view reschedules"
  ON appointment_reschedules FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'agent'::app_role)
    OR (
      has_role(auth.uid(), 'project_user'::app_role) 
      AND EXISTS (
        SELECT 1 FROM project_user_access pua
        JOIN projects p ON pua.project_id = p.id
        WHERE pua.user_id = auth.uid() 
        AND p.project_name = appointment_reschedules.project_name
      )
    )
  );

-- Policy: Authenticated users can insert reschedules
CREATE POLICY "Users can insert reschedules"
  ON appointment_reschedules FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Admins and agents can update reschedules
CREATE POLICY "Admins can update reschedules"
  ON appointment_reschedules FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'agent'::app_role)
  );

-- Trigger for updated_at
CREATE TRIGGER update_appointment_reschedules_updated_at
  BEFORE UPDATE ON appointment_reschedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE appointment_reschedules;