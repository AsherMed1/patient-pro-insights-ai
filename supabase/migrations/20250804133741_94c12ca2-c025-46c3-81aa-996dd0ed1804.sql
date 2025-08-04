-- Bulk update procedure_ordered for existing appointments to reflect automatic logic
-- Set procedure_ordered = false for cancelled and no show appointments
UPDATE public.all_appointments 
SET 
  procedure_ordered = false,
  updated_at = now()
WHERE procedure_ordered IS NULL 
  AND (
    LOWER(TRIM(status)) IN ('cancelled', 'canceled', 'no show', 'noshow', 'no-show')
  );

-- Set procedure_ordered = true for showed and won appointments  
UPDATE public.all_appointments 
SET 
  procedure_ordered = true,
  updated_at = now()
WHERE procedure_ordered IS NULL 
  AND (
    LOWER(TRIM(status)) IN ('showed', 'won', 'completed', 'attended')
  );

-- Log the bulk update operation
INSERT INTO public.security_audit_log (event_type, details)
VALUES ('bulk_procedure_ordered_update', jsonb_build_object(
  'operation', 'bulk_update_procedure_ordered',
  'logic_applied', 'cancelled/no_show = false, showed/won = true',
  'updated_at', now()
));