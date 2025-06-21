
-- Fix the has_role function to have an immutable search_path
-- Use CASCADE to drop dependent policies, then recreate them
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;

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

-- Recreate the policy that was dropped
CREATE POLICY "User form submissions access" ON public.form_submissions
  FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());
