WITH candidates AS (
  SELECT id, ghl_id, project_name, lead_name,
         ROW_NUMBER() OVER (
           PARTITION BY ghl_id, project_name
           ORDER BY COALESCE(date_of_appointment, created_at::date) DESC, created_at DESC
         ) AS rn
  FROM public.all_appointments
  WHERE is_superseded = false
    AND ghl_id IS NOT NULL
    AND COALESCE(is_reserved_block, false) = false
    AND COALESCE(lower(review_status), '') <> 'pending'
),
newest AS (
  SELECT ghl_id, project_name, lead_name FROM candidates WHERE rn = 1
),
older AS (
  SELECT id FROM candidates WHERE rn > 1
),
retired AS (
  UPDATE public.all_appointments a
  SET is_superseded = true
  FROM older o
  WHERE a.id = o.id
  RETURNING a.id
),
noted AS (
  INSERT INTO public.appointment_notes (appointment_id, note_text, created_by)
  SELECT r.id, 'Superseded — a newer booking exists for this patient (duplicate cleanup) — System', 'System'
  FROM retired r
  RETURNING 1
)
UPDATE public.all_appointments a
SET lead_name = n.lead_name
FROM newest n
WHERE a.ghl_id = n.ghl_id
  AND a.project_name = n.project_name
  AND a.is_superseded = false
  AND COALESCE(a.is_reserved_block, false) = false
  AND a.lead_name IS DISTINCT FROM n.lead_name;