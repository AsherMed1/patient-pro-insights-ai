
-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own profile
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Create policy for users to update their own profile
CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  RETURN new;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Secure the projects table with proper RLS
DROP POLICY IF EXISTS "Allow public access to projects" ON public.projects;
CREATE POLICY "Authenticated users can view projects" 
  ON public.projects 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create projects" 
  ON public.projects 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects" 
  ON public.projects 
  FOR UPDATE 
  TO authenticated
  USING (true);

-- Secure other sensitive tables
DROP POLICY IF EXISTS "Allow public access to all_calls" ON public.all_calls;
CREATE POLICY "Authenticated users can view calls" 
  ON public.all_calls 
  FOR SELECT 
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public access to all_appointments" ON public.all_appointments;
CREATE POLICY "Authenticated users can view appointments" 
  ON public.all_appointments 
  FOR SELECT 
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public access to form_submissions" ON public.form_submissions;
CREATE POLICY "Authenticated users can view form submissions" 
  ON public.form_submissions 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create form submissions" 
  ON public.form_submissions 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Hash existing project portal passwords (basic implementation)
-- Note: This is a simplified approach - in production, use proper bcrypt
UPDATE public.projects 
SET portal_password = encode(digest(portal_password, 'sha256'), 'hex')
WHERE portal_password IS NOT NULL;
