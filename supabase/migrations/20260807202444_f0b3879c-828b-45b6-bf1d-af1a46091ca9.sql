-- Recapture cases: setter policies now include the 'recapture' role
DROP POLICY IF EXISTS recapture_cases_setter_select ON public.recapture_cases;
CREATE POLICY recapture_cases_setter_select ON public.recapture_cases
FOR SELECT TO authenticated
USING (
  (public.has_role(auth.uid(), 'review_only'::app_role) OR public.has_role(auth.uid(), 'recapture'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.project_user_access pua
    JOIN public.projects p ON p.id = pua.project_id
    WHERE pua.user_id = auth.uid() AND p.project_name = recapture_cases.project_name
  )
);

DROP POLICY IF EXISTS recapture_cases_setter_update ON public.recapture_cases;
CREATE POLICY recapture_cases_setter_update ON public.recapture_cases
FOR UPDATE TO authenticated
USING (
  (public.has_role(auth.uid(), 'review_only'::app_role) OR public.has_role(auth.uid(), 'recapture'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.project_user_access pua
    JOIN public.projects p ON p.id = pua.project_id
    WHERE pua.user_id = auth.uid() AND p.project_name = recapture_cases.project_name
  )
)
WITH CHECK (
  (public.has_role(auth.uid(), 'review_only'::app_role) OR public.has_role(auth.uid(), 'recapture'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.project_user_access pua
    JOIN public.projects p ON p.id = pua.project_id
    WHERE pua.user_id = auth.uid() AND p.project_name = recapture_cases.project_name
  )
);

-- Attempts flow through has_recapture_case_access
CREATE OR REPLACE FUNCTION public.has_recapture_case_access(_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.recapture_cases c
    WHERE c.id = _case_id
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'agent'::app_role)
        OR public.has_role(auth.uid(), 'va'::app_role)
        OR (
          (public.has_role(auth.uid(), 'review_only'::app_role) OR public.has_role(auth.uid(), 'recapture'::app_role))
          AND EXISTS (
            SELECT 1
            FROM public.project_user_access pua
            JOIN public.projects p ON p.id = pua.project_id
            WHERE pua.user_id = auth.uid()
              AND p.project_name = c.project_name
          )
        )
      )
  )
$$;

-- Appointment visibility for recapture users (scoped to assigned projects)
CREATE POLICY "Recapture view assigned appointments" ON public.all_appointments
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'recapture'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.project_user_access pua
    JOIN public.projects p ON p.id = pua.project_id
    WHERE pua.user_id = auth.uid() AND p.project_name = all_appointments.project_name
  )
);

-- Notes: view + add for recapture users on their assigned projects
CREATE POLICY "Recapture view appointment notes" ON public.appointment_notes
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'recapture'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.all_appointments a
    JOIN public.projects p ON p.project_name = a.project_name
    JOIN public.project_user_access pua ON pua.project_id = p.id
    WHERE a.id = appointment_notes.appointment_id AND pua.user_id = auth.uid()
  )
);

CREATE POLICY "Recapture insert appointment notes" ON public.appointment_notes
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'recapture'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.all_appointments a
    JOIN public.projects p ON p.project_name = a.project_name
    JOIN public.project_user_access pua ON pua.project_id = p.id
    WHERE a.id = appointment_notes.appointment_id AND pua.user_id = auth.uid()
  )
);