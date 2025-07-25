-- Update app_role enum to match the three required roles
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('admin', 'agent', 'project_user');

-- Remove default constraint temporarily
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;

-- Update existing user_roles table to use new enum
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING 
  CASE role::text 
    WHEN 'admin' THEN 'admin'::public.app_role
    WHEN 'moderator' THEN 'agent'::public.app_role
    ELSE 'project_user'::public.app_role
  END;

-- Set new default value
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'project_user'::public.app_role;

-- Drop old enum type
DROP TYPE public.app_role_old;

-- Create project_user_access table for project-specific access
CREATE TABLE public.project_user_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Enable RLS on project_user_access
ALTER TABLE public.project_user_access ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_user_access
CREATE POLICY "Admins can manage all project access"
ON public.project_user_access
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own project access"
ON public.project_user_access
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Update has_role function to work with new enum values
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check project access for project users
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- Admins and agents have access to all projects
    public.has_role(_user_id, 'admin') OR 
    public.has_role(_user_id, 'agent') OR
    -- Project users have access only to assigned projects
    (public.has_role(_user_id, 'project_user') AND EXISTS (
      SELECT 1 FROM public.project_user_access 
      WHERE user_id = _user_id AND project_id = _project_id
    ))
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Add trigger for updated_at on project_user_access
CREATE TRIGGER update_project_user_access_updated_at
BEFORE UPDATE ON public.project_user_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();