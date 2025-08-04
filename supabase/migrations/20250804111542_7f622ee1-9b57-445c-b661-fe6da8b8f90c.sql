-- Update user_roles policies to allow admins to manage all user roles
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create new policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own roles"
ON public.user_roles
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all user roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update project_user_access policies to allow admins to manage all project access
CREATE POLICY "Agents can manage all project access"
ON public.project_user_access
FOR ALL
USING (public.has_role(auth.uid(), 'agent'))
WITH CHECK (public.has_role(auth.uid(), 'agent'));