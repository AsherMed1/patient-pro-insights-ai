
CREATE OR REPLACE FUNCTION public.get_project_call_summary(
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE(
  project_name text,
  inbound bigint,
  outbound bigint,
  confirmed bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH call_stats AS (
    SELECT 
      c.project_name,
      COUNT(*) FILTER (WHERE c.direction = 'inbound') AS inbound,
      COUNT(*) FILTER (WHERE c.direction = 'outbound') AS outbound
    FROM all_calls c
    WHERE c.project_name != 'PPM - Test Account'
      AND (p_date_from IS NULL OR c.call_datetime >= p_date_from)
      AND (p_date_to IS NULL OR c.call_datetime <= p_date_to)
    GROUP BY c.project_name
  ),
  appt_stats AS (
    SELECT 
      a.project_name,
      COUNT(*) FILTER (WHERE LOWER(TRIM(a.status)) = 'confirmed') AS confirmed
    FROM all_appointments a
    WHERE a.project_name != 'PPM - Test Account'
      AND (p_date_from IS NULL OR a.date_of_appointment >= p_date_from)
      AND (p_date_to IS NULL OR a.date_of_appointment <= p_date_to)
    GROUP BY a.project_name
  )
  SELECT 
    COALESCE(cs.project_name, aps.project_name) AS project_name,
    COALESCE(cs.inbound, 0) AS inbound,
    COALESCE(cs.outbound, 0) AS outbound,
    COALESCE(aps.confirmed, 0) AS confirmed
  FROM call_stats cs
  FULL OUTER JOIN appt_stats aps ON cs.project_name = aps.project_name
  ORDER BY (COALESCE(cs.inbound, 0) + COALESCE(cs.outbound, 0)) DESC;
END;
$$;
