## Goal
Hide Gail Pereira's stale July 30, 2025 3:30 PM appointment from the Georgia Endovascular portal, while keeping the June 30, 2026 3:30 PM appointment visible.

## Rows
Both rows share the same `ghl_id` (`6O0i963Hr4jGcUOXfdZI`) and lead, different `ghl_appointment_id`s — they are two distinct GHL appointments for the same contact.

- KEEP — `d9f2166f-58e9-4891-858f-7b9435e9c0d0` — 2026-06-30 15:30 — status Scheduled, approved
- HIDE — `a8e7e611-3855-4924-81e8-746f31875681` — 2025-07-30 15:30 — status Scheduled, approved

## Change
One `UPDATE` on `all_appointments` (via the insert tool):

```sql
UPDATE public.all_appointments
SET is_superseded = true,
    updated_at = now()
WHERE id = 'a8e7e611-3855-4924-81e8-746f31875681';
```

This is the standard portal "remove" — superseded rows are filtered out of every portal view but preserved for audit. No GHL call (the GHL appointment itself stays untouched, since the clinic only asked to remove it from the portal). No status change (status stays Scheduled, so no spurious Slack/webhook fires).

## Not doing
- Not deleting the row (recoverable this way, and matches how we've handled the same situation before).
- Not touching the June 30, 2026 row.
- Not syncing anything back to GHL.

Confirm and I'll run the update.