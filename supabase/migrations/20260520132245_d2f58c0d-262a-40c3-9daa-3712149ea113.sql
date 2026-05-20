-- Step 1: Collapse duplicate unscheduled leads, keeping the best survivor per (project, ghl_id)
WITH ranked AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY project_name, ghl_id
      ORDER BY
        CASE WHEN LOWER(TRIM(COALESCE(status,''))) IN
          ('cancelled','canceled','no show','noshow','no-show','rescheduled','do not call','donotcall','oon','showed','won')
        THEN 1 ELSE 0 END ASC,
        created_at DESC
    ) AS rn
  FROM public.all_appointments
  WHERE is_unscheduled = true
    AND ghl_id IS NOT NULL
    AND project_name IN ('ECCO Medical','Premier Vascular','Premier Vascular Surgery')
)
DELETE FROM public.all_appointments
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Step 2: Add partial unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uniq_unscheduled_ghl_contact_per_project
  ON public.all_appointments (project_name, ghl_id)
  WHERE is_unscheduled = true
    AND ghl_id IS NOT NULL
    AND project_name IN ('ECCO Medical', 'Premier Vascular', 'Premier Vascular Surgery');