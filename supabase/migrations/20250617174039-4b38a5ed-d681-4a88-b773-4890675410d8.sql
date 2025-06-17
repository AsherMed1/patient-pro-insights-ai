
-- Create a table for appointment notes
CREATE TABLE public.appointment_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint to link notes to appointments
ALTER TABLE public.appointment_notes 
ADD CONSTRAINT fk_appointment_notes_appointment_id 
FOREIGN KEY (appointment_id) REFERENCES public.all_appointments(id) 
ON DELETE CASCADE;

-- Add Row Level Security (RLS)
ALTER TABLE public.appointment_notes ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to view all appointment notes
CREATE POLICY "Users can view appointment notes" 
  ON public.appointment_notes 
  FOR SELECT 
  USING (true);

-- Create policy that allows users to create appointment notes
CREATE POLICY "Users can create appointment notes" 
  ON public.appointment_notes 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy that allows users to update appointment notes
CREATE POLICY "Users can update appointment notes" 
  ON public.appointment_notes 
  FOR UPDATE 
  USING (true);

-- Create policy that allows users to delete appointment notes
CREATE POLICY "Users can delete appointment notes" 
  ON public.appointment_notes 
  FOR DELETE 
  USING (true);

-- Create index for better performance when querying notes by appointment
CREATE INDEX idx_appointment_notes_appointment_id ON public.appointment_notes(appointment_id);
CREATE INDEX idx_appointment_notes_created_at ON public.appointment_notes(created_at DESC);
