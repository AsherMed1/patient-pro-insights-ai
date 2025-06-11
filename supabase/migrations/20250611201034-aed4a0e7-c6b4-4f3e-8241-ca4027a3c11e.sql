
-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'viewer');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create project permissions table
CREATE TABLE public.project_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('read', 'write', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id)
);

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to check project permissions
CREATE OR REPLACE FUNCTION public.has_project_permission(_user_id UUID, _project_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_permissions
    WHERE user_id = _user_id
      AND project_id = _project_id
      AND (
        permission_level = _permission OR
        permission_level = 'admin' OR
        (permission_level = 'write' AND _permission = 'read')
      )
  ) OR public.has_role(_user_id, 'admin')
$$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  
  -- Give the first user admin role, others get viewer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id,
    CASE 
      WHEN (SELECT COUNT(*) FROM auth.users) = 1 THEN 'admin'::app_role
      ELSE 'viewer'::app_role
    END
  );
  
  RETURN new;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_ad_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_to_lead_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_import_history ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow insert project forms" ON public.project_forms;
DROP POLICY IF EXISTS "Allow select project forms" ON public.project_forms;
DROP POLICY IF EXISTS "Allow update project forms" ON public.project_forms;
DROP POLICY IF EXISTS "Allow delete project forms" ON public.project_forms;
DROP POLICY IF EXISTS "Form templates are viewable by everyone" ON public.form_templates;
DROP POLICY IF EXISTS "Project forms are viewable by everyone" ON public.project_forms;
DROP POLICY IF EXISTS "Form submissions can be created by anyone" ON public.form_submissions;
DROP POLICY IF EXISTS "Form submissions are viewable by project owners" ON public.form_submissions;

-- Create secure RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create secure RLS policies for user_roles
CREATE POLICY "Admins can select all user roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert user roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user roles" ON public.user_roles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete user roles" ON public.user_roles
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Create secure RLS policies for project_permissions
CREATE POLICY "Admins can select all project permissions" ON public.project_permissions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own permissions" ON public.project_permissions
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert project permissions" ON public.project_permissions
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update project permissions" ON public.project_permissions
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete project permissions" ON public.project_permissions
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Create secure RLS policies for projects
CREATE POLICY "Admins can select all projects" ON public.projects
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view projects they have access to" ON public.projects
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.project_permissions
      WHERE user_id = auth.uid() AND project_id = projects.id
    )
  );

CREATE POLICY "Admins can insert projects" ON public.projects
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update projects" ON public.projects
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete projects" ON public.projects
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Create secure RLS policies for leads
CREATE POLICY "Admins and managers can select leads" ON public.new_leads
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.project_permissions pp ON p.id = pp.project_id
      WHERE p.project_name = new_leads.project_name
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can insert leads" ON public.new_leads
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can update leads" ON public.new_leads
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can delete leads" ON public.new_leads
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- Create secure RLS policies for calls
CREATE POLICY "Users can select calls for their projects" ON public.all_calls
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.project_permissions pp ON p.id = pp.project_id
      WHERE p.project_name = all_calls.project_name
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can insert calls" ON public.all_calls
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can update calls" ON public.all_calls
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can delete calls" ON public.all_calls
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- Create secure RLS policies for appointments
CREATE POLICY "Users can select appointments for their projects" ON public.all_appointments
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.project_permissions pp ON p.id = pp.project_id
      WHERE p.project_name = all_appointments.project_name
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can insert appointments" ON public.all_appointments
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can update appointments" ON public.all_appointments
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can delete appointments" ON public.all_appointments
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- Create secure RLS policies for ad spend
CREATE POLICY "Users can select ad spend for their projects" ON public.facebook_ad_spend
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.project_permissions pp ON p.id = pp.project_id
      WHERE p.project_name = facebook_ad_spend.project_name
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can insert ad spend" ON public.facebook_ad_spend
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can update ad spend" ON public.facebook_ad_spend
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can delete ad spend" ON public.facebook_ad_spend
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- Create secure RLS policies for form submissions
CREATE POLICY "Admins and managers can select form submissions" ON public.form_submissions
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Anyone can insert form submissions" ON public.form_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins and managers can update form submissions" ON public.form_submissions
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can delete form submissions" ON public.form_submissions
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- Create secure RLS policies for form templates
CREATE POLICY "Anyone can view form templates" ON public.form_templates
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can insert form templates" ON public.form_templates
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can update form templates" ON public.form_templates
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can delete form templates" ON public.form_templates
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- Create secure RLS policies for project forms
CREATE POLICY "Anyone can view project forms" ON public.project_forms
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can insert project forms" ON public.project_forms
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can update project forms" ON public.project_forms
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can delete project forms" ON public.project_forms
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- Create secure RLS policies for agent stats
CREATE POLICY "Authenticated users can select agent stats" ON public.agent_performance_stats
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can insert agent stats" ON public.agent_performance_stats
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can update agent stats" ON public.agent_performance_stats
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can delete agent stats" ON public.agent_performance_stats
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- Create secure RLS policies for agents
CREATE POLICY "Authenticated users can view agents" ON public.agents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can insert agents" ON public.agents
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can update agents" ON public.agents
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can delete agents" ON public.agents
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- Create secure RLS policies for speed to lead stats
CREATE POLICY "Authenticated users can select speed to lead stats" ON public.speed_to_lead_stats
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can insert speed to lead stats" ON public.speed_to_lead_stats
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can update speed to lead stats" ON public.speed_to_lead_stats
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can delete speed to lead stats" ON public.speed_to_lead_stats
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- Create secure RLS policies for CSV import history
CREATE POLICY "Authenticated users can view import history" ON public.csv_import_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can insert import history" ON public.csv_import_history
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can update import history" ON public.csv_import_history
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can delete import history" ON public.csv_import_history
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );
