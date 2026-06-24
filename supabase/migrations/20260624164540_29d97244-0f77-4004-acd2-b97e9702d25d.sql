CREATE OR REPLACE FUNCTION public.user_accessible_project_names(_user_id uuid)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(p.project_name), ARRAY[]::text[])
  FROM public.project_user_access pua
  JOIN public.projects p ON p.id = pua.project_id
  WHERE pua.user_id = _user_id
$$;

DROP POLICY IF EXISTS "Project users view assigned appointments" ON public.all_appointments;
DROP POLICY IF EXISTS "Project users see assigned project appointments" ON public.all_appointments;

CREATE POLICY "Project users see assigned project appointments"
ON public.all_appointments FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'agent'::app_role)
  OR (
    has_role(auth.uid(), 'project_user'::app_role)
    AND project_name = ANY(public.user_accessible_project_names(auth.uid()))
  )
);

CREATE INDEX IF NOT EXISTS idx_project_user_access_user_id
  ON public.project_user_access(user_id);