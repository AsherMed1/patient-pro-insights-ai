-- Ensure admins can delete from all relevant tables

-- Update profiles policies to ensure admins can delete any profile
DROP POLICY IF EXISTS "Admins can delete all profiles" ON public.profiles;
CREATE POLICY "Admins can delete all profiles"
ON public.profiles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Ensure project_user_access has proper admin delete policy
DROP POLICY IF EXISTS "Admins can delete all project access" ON public.project_user_access;
CREATE POLICY "Admins can delete all project access"
ON public.project_user_access
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Ensure user_roles has proper admin delete policy  
DROP POLICY IF EXISTS "Admins can delete all user roles" ON public.user_roles;
CREATE POLICY "Admins can delete all user roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));