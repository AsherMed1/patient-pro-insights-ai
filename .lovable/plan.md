

## Fix: "Welcome Call" Should Auto-Set Internal Process Complete

### Problem
The database trigger `handle_appointment_status_completion` auto-sets `internal_process_complete = true` for terminal statuses like Showed, Cancelled, No Show, OON, and Do Not Call — but **"Welcome Call" is not in that list**. Since Welcome Call is a workflow milestone (the patient has been contacted), it should also mark the internal process as complete.

### Fix

**New migration** — Add `'welcome call'` to the terminal statuses list in the trigger function:

```sql
CREATE OR REPLACE FUNCTION public.handle_appointment_status_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS NOT NULL THEN
    IF LOWER(TRIM(NEW.status)) IN ('confirmed', 'pending') THEN
      NEW.internal_process_complete := false;
      NEW.procedure_ordered := NULL;
      NEW.procedure_status := NULL;
      NEW.updated_at := now();
    END IF;

    IF LOWER(TRIM(NEW.status)) IN ('no show', 'cancelled', 'canceled', 'showed', 'oon', 'do not call', 'donotcall', 'welcome call') THEN
      IF LOWER(TRIM(NEW.status)) IN ('no show', 'cancelled', 'canceled', 'oon', 'do not call', 'donotcall') THEN
        NEW.procedure_ordered := false;
      END IF;
      
      NEW.internal_process_complete := true;
      NEW.updated_at := now();
      
      INSERT INTO public.security_audit_log (event_type, details)
      VALUES ('appointment_auto_completed', jsonb_build_object(
        'appointment_id', NEW.id,
        'lead_name', NEW.lead_name,
        'project_name', NEW.project_name,
        'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        'new_status', NEW.status,
        'procedure_ordered_updated', LOWER(TRIM(NEW.status)) IN ('no show', 'cancelled', 'canceled', 'oon', 'do not call', 'donotcall'),
        'internal_process_complete_set', true,
        'trigger_operation', TG_OP
      ));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
```

Key difference: `'welcome call'` added to line 16's IN list. Welcome Call does NOT set `procedure_ordered = false` (inner IF unchanged) since procedure tracking is still relevant for these patients.

### Backfill
Also fix Lakesta Ray's record directly:
```sql
UPDATE all_appointments 
SET internal_process_complete = true 
WHERE id = 'a02bd934' -- will use full UUID after lookup
  AND LOWER(status) = 'welcome call' 
  AND internal_process_complete = false;
```

### Single migration file, no application code changes needed.

