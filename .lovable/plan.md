## Issue

Haig Nurse (LJV, GHL `fIZXZbZSOTcbLAFKpYKt`) was rescheduled in GHL from 6/1 → 6/8. After the GHL webhook ran, the row was bumped out of **Upcoming** into **New** and the status was clobbered from **Welcome Call → Confirmed**.

## Root cause

In `supabase/functions/ghl-webhook-handler/index.ts` (~lines 802–860), when a date change is detected the handler unconditionally:

1. Sets `internal_process_complete = false` → row falls out of the Upcoming tab filter (which requires IPC=true) and lands in the New tab.
2. Overwrites `status = 'Confirmed'` → wipes portal-only statuses like **Welcome Call** that were set by the team.

This happens even when the existing row is already a fully-vetted, post-confirmation appointment (Confirmed / Welcome Call) — so a routine reschedule incorrectly demotes it back to the New queue.

A separate but related issue: **Welcome Call** is not listed in the portal-only-status guard (~line 880) alongside OON / Do Not Call / Cancelled, so any GHL status echo can overwrite it.

## Current state of Haig

- `status = 'Welcome Call'`, `IPC = true`, `date = 2026-06-08`, `review_status = approved`.
- This row already satisfies the Upcoming filter, so after a hard refresh it should appear there. No data fix needed for this record — Natalie's manual status change back to Welcome Call also flipped IPC back to true.

## Proposed fix (code only)

Edit `supabase/functions/ghl-webhook-handler/index.ts`:

1. **Preserve IPC on reschedule of post-confirmation rows.** Inside the date-change branch (~line 824), only set `internal_process_complete = false` when the existing status is `Pending`, blank, or a portal-only terminal status being recovered (OON / DND / Cancelled). For rows already in `Confirmed`, `Welcome Call`, `Showed`, `No Show`, `Won`, keep IPC as-is so the row stays in Upcoming.
2. **Don't overwrite status with "Confirmed" on reschedule when existing status is `Welcome Call`.** Treat Welcome Call the same as the portal-only guard: keep the existing status, just update date/time. Still record the reschedule audit note.
3. **Add `'welcome call'` to the portal-only-status guard list (~line 880)** so any subsequent GHL status echo cannot clobber it.

No frontend or migration changes required. The current Haig row already reads correctly; only future reschedules need the patch.

```text
Date-change branch decision table (new)
existing.status        → IPC after reschedule   status after reschedule
─────────────────────────────────────────────────────────────────────
Confirmed              → keep (true)            keep "Confirmed"
Welcome Call           → keep (true)            keep "Welcome Call"
Showed / No Show / Won → keep                   keep
OON / DND / Cancelled  → false (re-open)        "Confirmed" (recovery)
Pending / blank / new  → false                  "Confirmed"
```
