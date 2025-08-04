-- Update all existing appointments with no show or cancelled status
-- to set procedure_ordered = false and mark as completed

UPDATE public.all_appointments 
SET 
  procedure_ordered = false,
  status = CASE 
    WHEN LOWER(TRIM(status)) LIKE '%no%show%' THEN 'No Show - Completed'
    WHEN LOWER(TRIM(status)) LIKE '%cancel%' THEN 'Cancelled - Completed'
    ELSE status
  END,
  updated_at = now()
WHERE 
  status IS NOT NULL 
  AND (
    LOWER(TRIM(status)) LIKE '%no%show%' 
    OR LOWER(TRIM(status)) LIKE '%cancel%'
  )
  AND status NOT LIKE '% - Completed'; -- Don't update already completed ones

-- Log the bulk update operation
INSERT INTO public.security_audit_log (event_type, details)
VALUES ('bulk_appointment_completion', jsonb_build_object(
  'operation', 'bulk_update_existing_appointments',
  'criteria', 'status contains no show or cancelled',
  'actions_taken', ARRAY['set_procedure_ordered_false', 'mark_as_completed'],
  'timestamp', now(),
  'affected_statuses', ARRAY['no show', 'cancelled', 'canceled']
));