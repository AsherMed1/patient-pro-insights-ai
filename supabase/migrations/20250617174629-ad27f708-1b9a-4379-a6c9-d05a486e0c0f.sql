
-- Create a table for project tags
CREATE TABLE public.project_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  tag_name TEXT NOT NULL,
  tag_color TEXT NOT NULL DEFAULT '#3B82F6',
  tag_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, tag_name)
);

-- Create a table for appointment tags (many-to-many relationship)
CREATE TABLE public.appointment_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL,
  project_tag_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(appointment_id, project_tag_id)
);

-- Add foreign key constraints
ALTER TABLE public.project_tags 
ADD CONSTRAINT fk_project_tags_project_id 
FOREIGN KEY (project_id) REFERENCES public.projects(id) 
ON DELETE CASCADE;

ALTER TABLE public.appointment_tags 
ADD CONSTRAINT fk_appointment_tags_appointment_id 
FOREIGN KEY (appointment_id) REFERENCES public.all_appointments(id) 
ON DELETE CASCADE;

ALTER TABLE public.appointment_tags 
ADD CONSTRAINT fk_appointment_tags_project_tag_id 
FOREIGN KEY (project_tag_id) REFERENCES public.project_tags(id) 
ON DELETE CASCADE;

-- Add Row Level Security (RLS)
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for project_tags
CREATE POLICY "Users can view project tags" 
  ON public.project_tags 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create project tags" 
  ON public.project_tags 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update project tags" 
  ON public.project_tags 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete project tags" 
  ON public.project_tags 
  FOR DELETE 
  USING (true);

-- Create policies for appointment_tags
CREATE POLICY "Users can view appointment tags" 
  ON public.appointment_tags 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create appointment tags" 
  ON public.appointment_tags 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update appointment tags" 
  ON public.appointment_tags 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete appointment tags" 
  ON public.appointment_tags 
  FOR DELETE 
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_project_tags_project_id ON public.project_tags(project_id);
CREATE INDEX idx_appointment_tags_appointment_id ON public.appointment_tags(appointment_id);
CREATE INDEX idx_appointment_tags_project_tag_id ON public.appointment_tags(project_tag_id);
