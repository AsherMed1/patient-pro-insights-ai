

## Fix: Reset procedure_status when appointment reverts to Confirmed/Pending

### Problem
When an appointment is cancelled (trigger sets `procedure_ordered = false` / `procedure_status = 'no_procedure'`), then later re-confirmed, the procedure status stays as "No Procedure Ordered" instead of resetting to null (Not Set).

### Fix
Update the `handle_appointment_status_completion()` trigger function to also reset `procedure_ordered` and `procedure_status` to null when status reverts to `confirmed` or `pending`.

| File | Change |
|------|--------|
| New migration SQL | Add `NEW.procedure_ordered := NULL; NEW.procedure_status := NULL;` inside the existing `confirmed/pending` reset block (line 11-13 of the current trigger), alongside the existing `internal_process_complete := false` reset. |

### Migration SQL
```sql
CREATE OR REPLACE FUNCTION public.handle_appointment_status_completion()
  -- Same signature, just add two lines to the confirmed/pending block:
  IF LOWER(TRIM(NEW.status)) IN ('confirmed', 'pending') THEN
    NEW.internal_process_complete := false;
    NEW.procedure_ordered := NULL;      -- NEW
    NEW.procedure_status := NULL;       -- NEW
    NEW.updated_at := now();
  END IF;
  -- Rest of function unchanged
```

Also include a one-time fix for the test appointment (daac27f4) to reset its procedure_status:
```sql
UPDATE all_appointments 
SET procedure_ordered = NULL, procedure_status = NULL, updated_at = now()
WHERE id = 'daac27f4%'; -- exact ID from screenshot
```

