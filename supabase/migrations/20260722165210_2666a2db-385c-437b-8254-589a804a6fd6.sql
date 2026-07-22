
CREATE POLICY qa_cases_va_full ON public.qa_cases
  FOR ALL
  USING (public.has_role(auth.uid(), 'va'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'va'::app_role));

CREATE OR REPLACE FUNCTION public.has_qa_case_access(_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.qa_cases c
    WHERE c.id = _case_id
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'agent'::app_role)
        OR public.has_role(auth.uid(), 'va'::app_role)
        OR (
          public.has_role(auth.uid(), 'qa_specialist'::app_role)
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
$function$;
