
-- Enable RLS on project_forms table (if not already enabled)
ALTER TABLE public.project_forms ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert project forms
-- (You can make this more restrictive later if needed)
CREATE POLICY "Allow insert project forms" 
  ON public.project_forms 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy to allow anyone to select project forms
CREATE POLICY "Allow select project forms" 
  ON public.project_forms 
  FOR SELECT 
  USING (true);

-- Create policy to allow anyone to update project forms
CREATE POLICY "Allow update project forms" 
  ON public.project_forms 
  FOR UPDATE 
  USING (true);

-- Create policy to allow anyone to delete project forms
CREATE POLICY "Allow delete project forms" 
  ON public.project_forms 
  FOR DELETE 
  USING (true);
