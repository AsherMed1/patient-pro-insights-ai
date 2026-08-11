CREATE OR REPLACE FUNCTION public.get_project_stats(project_filter text DEFAULT NULL::text)
RETURNS TABLE(project_name text, leads_count bigint, calls_count bigint, appointments_count bigint, confirmed_appointments_count bigint, ad_spend numeric, last_activity timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH p AS (
    SELECT pr.project_name AS name FROM public.projects pr
    WHERE project_filter IS NULL OR project_filter = 'ALL' OR pr.project_name = project_filter
  ),
  l AS (
    SELECT nl.project_name AS name, count(*)::bigint AS c, max(nl.updated_at) AS last_at
    FROM public.new_leads nl GROUP BY 1
  ),
  c AS (
    SELECT ac.project_name AS name, count(*)::bigint AS c, max(ac.updated_at) AS last_at
    FROM public.all_calls ac GROUP BY 1
  ),
  a AS (
    SELECT aa.project_name AS name,
           count(*)::bigint AS c,
           count(*) FILTER (WHERE aa.status = 'Confirmed')::bigint AS confirmed,
           max(aa.updated_at) AS last_at
    FROM public.all_appointments aa
    WHERE aa.is_reserved_block IS NULL OR aa.is_reserved_block = false
    GROUP BY 1
  )
  SELECT p.name,
         COALESCE(l.c, 0),
         COALESCE(c.c, 0),
         COALESCE(a.c, 0),
         COALESCE(a.confirmed, 0),
         0::numeric,
         GREATEST(COALESCE(l.last_at, '-infinity'::timestamptz), COALESCE(c.last_at, '-infinity'::timestamptz), COALESCE(a.last_at, '-infinity'::timestamptz))
           AS last_activity
  FROM p
  LEFT JOIN l ON l.name = p.name
  LEFT JOIN c ON c.name = p.name
  LEFT JOIN a ON a.name = p.name
  ORDER BY p.name;
$function$;

CREATE INDEX IF NOT EXISTS idx_all_calls_project_updated ON public.all_calls (project_name, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_all_calls_project_datetime ON public.all_calls (project_name, call_datetime DESC);
CREATE INDEX IF NOT EXISTS idx_new_leads_project_updated ON public.new_leads (project_name, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_all_appointments_project_updated ON public.all_appointments (project_name, updated_at DESC);