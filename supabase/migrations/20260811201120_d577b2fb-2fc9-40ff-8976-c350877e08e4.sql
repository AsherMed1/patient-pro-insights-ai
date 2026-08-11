CREATE OR REPLACE FUNCTION public.has_recapture_case_access(_case_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.recapture_cases c
    WHERE c.id = _case_id
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'agent'::app_role)
        OR public.has_role(auth.uid(), 'va'::app_role)
        OR public.has_role(auth.uid(), 'review_only'::app_role)
        OR public.has_role(auth.uid(), 'recapture'::app_role)
      )
  )
$function$;