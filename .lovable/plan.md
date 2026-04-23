

## Backfill Superseded Appointments — Direct SQL Execution

### Approach

Run the backfill as a single SQL migration instead of looping from the browser. Same logic as the `mark_superseded_on_change` trigger, applied retroactively to every existing row in one transaction.

### What the migration does

1. **Dry-run report first** (returned via `RAISE NOTICE` in the migration output):
   - Total candidate rows to be marked
   - Per-project breakdown
   - Sample of 25 patients affected
2. **Then executes the update** in the same migration so the user gets one approval and a single transaction.

### SQL logic

```sql
WITH groups AS (
  SELECT
    id,
    project_name,
    lead_name,
    status,
    created_at,
    was_ever_confirmed,
    -- group key: ghl_id when available, else phone+name
    COALESCE(ghl_id, lead_phone_number || '|' || LOWER(TRIM(lead_name))) AS group_key
  FROM all_appointments
  WHERE COALESCE(is_reserved_block, false) = false
),
with_active_newer AS (
  SELECT g.*,
    EXISTS (
      SELECT 1 FROM groups g2
      WHERE g2.project_name = g.project_name
        AND g2.group_key = g.group_key
        AND g2.created_at > g.created_at
        AND (g2.status IS NULL OR LOWER(TRIM(g2.status)) NOT IN
          ('cancelled','canceled','no show','noshow','no-show',
           'rescheduled','do not call','donotcall','oon'))
    ) AS has_active_newer
  FROM groups g
)
UPDATE all_appointments a
SET is_superseded = true, updated_at = now()
FROM with_active_newer w
WHERE a.id = w.id
  AND COALESCE(a.was_ever_confirmed, false) = false
  AND LOWER(TRIM(a.status)) IN
    ('cancelled','canceled','no show','noshow','no-show',
     'rescheduled','do not call','donotcall','oon')
  AND w.has_active_newer = true
  AND COALESCE(a.is_superseded, false) = false;
```

### Safeguards

- `was_ever_confirmed = true` records are skipped (legitimate completed visits)
- Reserved time blocks excluded
- Already-superseded rows skipped (idempotent — safe to re-run)
- Scoped per `project_name` so cross-project records stay separate
- `Showed` and `Won` are NOT in the terminal list for this purpose — they're legitimate completions, not duplicates to hide
- All updates in a single transaction → atomic rollback if anything fails

### After execution

I'll verify by re-querying:
- Total rows now flagged `is_superseded = true`
- Spot check Sally Lutchman and Vietta Brown — confirm only the active record shows in the working tabs
- Confirm Mark Bindah's 4 records collapse to 1 active in working views

### Files touched

| File | Change |
|---|---|
| New migration `backfill_superseded_appointments` | Executes the UPDATE described above with NOTICE reporting |

### Risk

Low. Reversible with one SQL line: `UPDATE all_appointments SET is_superseded = false WHERE updated_at >= '<timestamp of migration>' AND is_superseded = true;` — and we have the timestamp from the migration. No data loss; we're only flipping a boolean used for filtering.

### Approve to proceed
Approve and I'll switch to default mode, run the migration, then run the verification queries and report counts back.

