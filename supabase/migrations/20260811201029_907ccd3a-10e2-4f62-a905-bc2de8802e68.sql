DROP POLICY IF EXISTS recapture_cases_setter_select ON public.recapture_cases;
DROP POLICY IF EXISTS recapture_cases_setter_update ON public.recapture_cases;

CREATE POLICY recapture_cases_setter_select
ON public.recapture_cases
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'review_only'::app_role)
  OR has_role(auth.uid(), 'recapture'::app_role)
);

CREATE POLICY recapture_cases_setter_update
ON public.recapture_cases
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'review_only'::app_role)
  OR has_role(auth.uid(), 'recapture'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'review_only'::app_role)
  OR has_role(auth.uid(), 'recapture'::app_role)
);