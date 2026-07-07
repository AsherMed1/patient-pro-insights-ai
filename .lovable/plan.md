
## Actual root cause (updated)

Ran `backfill-ghl-appointment` for Jill's contact. The confirmed event `PLcSM41LaDpyvm8Pkzzd` (2026-07-09 14:30) was rejected by the Postgres unique constraint `unique_appointment_ghl_datetime`, defined as:

```
UNIQUE (ghl_id, date_of_appointment, requested_time)
```

Our existing Cancelled row for the same contact is at the same date/time, so any subsequent booking at that slot is blocked at insert time — regardless of status. That is why the confirmed appt never made it into the DB or the Review Queue. The reactivation branch in `findExistingAppointment` wasn't the culprit.

## Is the fix safe?

Yes, when done as a single migration in the right order. Details:

1. **Old constraint dropped, new partial unique index created in one migration.** Postgres runs both statements in one transaction, so there is no window where duplicates could sneak in.
2. **Partial index only counts "active" rows.** It ignores rows where status is Cancelled/Canceled/No Show/Rescheduled/Do Not Call/OON/Welcome Call, or where `is_superseded=true`, or where any of the three columns is NULL. That matches the business rule: those rows are terminal history and must not block a real rebooking.
3. **Pre-check to guarantee the index builds.** Before creating the new index, I'll run a read-only SELECT to confirm no existing "active" duplicates exist. If any surface, we resolve them first (mark older as superseded) — otherwise the `CREATE UNIQUE INDEX` would fail and abort the whole migration safely (no data change).
4. **Existing active rows keep their protection.** Two active (Confirmed/Pending/Showed/etc.) rows for the same (ghl_id, date, time) will still be blocked exactly as before.
5. **Non-destructive.** No data is deleted or updated. Only the constraint definition changes. Rolling back is a one-line reverse migration.
6. **No RLS/policy changes.** No permission or access surface changes.

## Fix plan (build order)

### 1. Pre-check (read-only)

Run:
```sql
SELECT ghl_id, date_of_appointment, requested_time, COUNT(*) 
FROM public.all_appointments
WHERE ghl_id IS NOT NULL 
  AND date_of_appointment IS NOT NULL 
  AND requested_time IS NOT NULL
  AND COALESCE(is_superseded, false) = false
  AND (status IS NULL OR LOWER(TRIM(status)) NOT IN 
       ('cancelled','canceled','no show','noshow','no-show','rescheduled',
        'do not call','donotcall','oon','welcome call'))
GROUP BY 1,2,3 HAVING COUNT(*) > 1;
```
If it returns anything, resolve those first (mark older as superseded) before the index migration.

### 2. Migration

```sql
ALTER TABLE public.all_appointments 
  DROP CONSTRAINT IF EXISTS unique_appointment_ghl_datetime;

DROP INDEX IF EXISTS public.unique_appointment_ghl_datetime_active;

CREATE UNIQUE INDEX unique_appointment_ghl_datetime_active
ON public.all_appointments (ghl_id, date_of_appointment, requested_time)
WHERE ghl_id IS NOT NULL
  AND date_of_appointment IS NOT NULL
  AND requested_time IS NOT NULL
  AND COALESCE(is_superseded, false) = false
  AND (status IS NULL OR LOWER(TRIM(status)) NOT IN (
    'cancelled','canceled','no show','noshow','no-show',
    'rescheduled','do not call','donotcall','oon','welcome call'
  ));
```

### 3. Re-run backfill for Jill

Call `backfill-ghl-appointment` again with `{ projectName: "Apex Vascular", contactIds: ["foSMURdTUCSZoXbpeuAR"] }`. The confirmed event `PLcSM41LaDpyvm8Pkzzd` should now insert cleanly as a pending Review Queue row.

### 4. Verify

- `SELECT` on `all_appointments` for `ghl_id='foSMURdTUCSZoXbpeuAR'` → expect 2 rows (Cancelled + new pending Confirmed).
- Open Apex Vascular → Review Queue → confirmed appt shows as pending.

### 5. Memory update

Add to `mem://data-integrity/appointment-uniqueness`: "Unique-slot enforcement uses a partial index scoped to active, non-superseded rows so cancelled/terminal history never blocks a rebooking."

## Not doing (and why)

- **Not touching `findExistingAppointment` reactivation logic.** The earlier hypothesis about `was_ever_confirmed=true` blocking reactivation was wrong. That path was actually returning `null` correctly; the DB constraint was the real gate. Changing reactivation now would add risk with no benefit.
