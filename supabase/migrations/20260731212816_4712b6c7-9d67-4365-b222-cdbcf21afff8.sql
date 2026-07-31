UPDATE public.all_appointments
SET calendar_name = CASE
    WHEN patient_intake_notes ILIKE '%7x89zo0Ev5hhZVyqNAwz%' THEN 'Request your GAE Consultation at Rockville Office'
    WHEN patient_intake_notes ILIKE '%PpBNj2YGXka8PP5drkNE%' THEN 'Request your GAE Consultation at Germantown Office'
    WHEN patient_intake_notes ILIKE '%nry6I37wUs1BAWNhqbVY%' THEN 'Request your GAE Consultation at Olney Office'
  END,
  updated_at = now()
WHERE project_name = 'Horizon Vascular Specialists'
  AND calendar_name = 'Unknown'
  AND (patient_intake_notes ILIKE '%7x89zo0Ev5hhZVyqNAwz%'
    OR patient_intake_notes ILIKE '%PpBNj2YGXka8PP5drkNE%'
    OR patient_intake_notes ILIKE '%nry6I37wUs1BAWNhqbVY%');