UPDATE public.all_appointments
SET time_preference = CASE
    WHEN patient_intake_notes ~* 'time preference[^\n]*:\s*morning'   THEN 'morning'
    WHEN patient_intake_notes ~* 'time preference[^\n]*:\s*afternoon' THEN 'afternoon'
    WHEN patient_intake_notes ~* 'time preference[^\n]*:\s*evening'   THEN 'evening'
    ELSE time_preference
  END,
  updated_at = now()
WHERE project_name = 'Premier Vascular'
  AND COALESCE(time_preference, 'no_preference') = 'no_preference'
  AND patient_intake_notes ~* 'time preference[^\n]*:\s*(morning|afternoon|evening)';