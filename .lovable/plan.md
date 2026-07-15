## Sidney Pye — Humble Vascular Surgery Center

Two active portal rows for the same GHL contact (`VFzmfQOYjw9qNnjKhyBI`, phone +1 713-201-9111):

| Portal ID | Date/Time | Status | Created | Notes |
|---|---|---|---|---|
| `039ff18c-54bb-4e4a-9eb0-144be3f0f75a` | Jul 14, 10:00 AM | Welcome Call | Jul 11 | **duplicate to remove** |
| `2121530c-39d4-4ae4-975b-3e8587e1862d` | Jul 27, 10:00 AM | Welcome Call | Jul 15 | **keep** |

## What actually happened (root cause)

Audit-log timeline for the Jul 14 row (`039ff18c…`):

1. Jul 11 19:29 — created from GHL webhook (Jul 14 appt).
2. Jul 13 20:59 — portal user changed Confirmed → Welcome Call.
3. Jul 13 21:06 — portal user changed Welcome Call → **Cancelled** (patient rescheduled).
4. Jul 15 14:12 — GHL sent the reschedule as a **new appointment** for Jul 27. Handler correctly created the second row (`2121530c…`).
5. Jul 15 17:25 — portal user re-opened the Jul 14 row and changed Cancelled → **Welcome Call**, resurrecting it. That is the moment the duplicate appeared.

Two structural reasons this wasn't auto-cleaned:

- Neither row has a `ghl_appointment_id` (`appointment_id` is NULL on both), so `ghl-webhook-handler` couldn't match the Jul 27 payload to the Jul 14 row and update it in place — it created a new row. This is expected for this project's flow.
- `mark_superseded_on_change` only marks older Cancelled siblings as `is_superseded=true` when `was_ever_confirmed=false`. The Jul 14 row had been Confirmed once (`was_ever_confirmed=true`), so it stayed visible and remained editable back to a non-terminal status.

The immediate trigger was human — a portal user un-cancelled a stale row — but the guardrails allowed it silently.

## Fix

### 1. Data cleanup (this record only)
Mark the Jul 14 row `is_superseded=true` and set status back to `Cancelled` so it drops out of every portal view but the history is preserved:

```
UPDATE all_appointments
SET status='Cancelled', is_superseded=true, updated_at=now()
WHERE id='039ff18c-54bb-4e4a-9eb0-144be3f0f75a';
```

Plus one audit_logs row explaining the manual cleanup.

I will **not** hard-delete it — the reschedule/cancel history is real audit data.

### 2. Safe structural fix (prevents recurrence, no behavior change for normal flow)

Extend `mark_superseded_on_change` (trigger on `all_appointments`) so that when a row transitions **out of a terminal status back to an active status** (e.g. Cancelled → Welcome Call/Confirmed/Pending), the trigger checks for a newer active sibling on the same `ghl_id` (or same phone+name when `ghl_id` is null). If one exists, the reactivated row is immediately marked `is_superseded=true` so it stays out of client views.

Why this is safe:
- Only fires when a newer active sibling already exists for the same contact — the normal "un-cancel by mistake with no other row" path is untouched.
- Doesn't block or reject the update, so no portal UX regressions or edge-function failures.
- Uses the same sibling-lookup predicate the trigger already uses for the reverse direction, so no new matching logic.
- Terminal-status list stays the shared constant already in the function.

### Technical notes
- File touched: `supabase/functions` migration adding the updated `mark_superseded_on_change` function body (existing trigger stays bound).
- No frontend changes.
- No changes to `ghl-webhook-handler`, EMR queue, or Slack.
- Audit log entry recorded for the manual Jul 14 supersede.

Once you approve, I'll (a) supersede `039ff18c…` and (b) ship the trigger update as one migration.
