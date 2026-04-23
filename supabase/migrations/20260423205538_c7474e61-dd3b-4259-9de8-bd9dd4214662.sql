
DO $$
DECLARE
  candidate_count integer;
BEGIN
  WITH groups AS (
    SELECT
      id,
      project_name,
      lead_name,
      status,
      created_at,
      was_ever_confirmed,
      COALESCE(ghl_id, lead_phone_number || '|' || LOWER(TRIM(lead_name))) AS group_key
    FROM public.all_appointments
    WHERE COALESCE(is_reserved_block, false) = false
  ),
  with_active_newer AS (
    SELECT g.id
    FROM groups g
    WHERE EXISTS (
      SELECT 1 FROM groups g2
      WHERE g2.project_name = g.project_name
        AND g2.group_key = g.group_key
        AND g2.created_at > g.created_at
        AND (g2.status IS NULL OR LOWER(TRIM(g2.status)) NOT IN
          ('cancelled','canceled','no show','noshow','no-show',
           'rescheduled','do not call','donotcall','oon'))
    )
  )
  SELECT COUNT(*) INTO candidate_count
  FROM public.all_appointments a
  JOIN with_active_newer w ON a.id = w.id
  WHERE COALESCE(a.was_ever_confirmed, false) = false
    AND LOWER(TRIM(a.status)) IN
      ('cancelled','canceled','no show','noshow','no-show',
       'rescheduled','do not call','donotcall','oon')
    AND COALESCE(a.is_superseded, false) = false;

  RAISE NOTICE 'Backfill candidates to mark superseded: %', candidate_count;
END $$;

WITH groups AS (
  SELECT
    id,
    project_name,
    lead_name,
    status,
    created_at,
    was_ever_confirmed,
    COALESCE(ghl_id, lead_phone_number || '|' || LOWER(TRIM(lead_name))) AS group_key
  FROM public.all_appointments
  WHERE COALESCE(is_reserved_block, false) = false
),
with_active_newer AS (
  SELECT g.id
  FROM groups g
  WHERE EXISTS (
    SELECT 1 FROM groups g2
    WHERE g2.project_name = g.project_name
      AND g2.group_key = g.group_key
      AND g2.created_at > g.created_at
      AND (g2.status IS NULL OR LOWER(TRIM(g2.status)) NOT IN
        ('cancelled','canceled','no show','noshow','no-show',
         'rescheduled','do not call','donotcall','oon'))
  )
)
UPDATE public.all_appointments a
SET is_superseded = true, updated_at = now()
FROM with_active_newer w
WHERE a.id = w.id
  AND COALESCE(a.was_ever_confirmed, false) = false
  AND LOWER(TRIM(a.status)) IN
    ('cancelled','canceled','no show','noshow','no-show',
     'rescheduled','do not call','donotcall','oon')
  AND COALESCE(a.is_superseded, false) = false;
