

## Welcome Call Status Blocks GHL Cancellation Sync — Root Cause & Fix

### What happened (Oralia Miller)

| Time | Source | Event |
|---|---|---|
| Apr 15, 3:16 PM | GHL → portal | Appointment created, status `Confirmed` |
| Apr 16, 6:48 PM | Portal (Nichole) | Manually changed status to `Welcome Call` |
| **Apr 21, 7:10–7:11 PM** | **GHL → portal (9 webhook hits)** | **Cancel + other field updates fired. Row was matched and other fields were touched, but the `status` change was silently dropped.** |

The audit log shows nine consecutive `UPDATE` events from those minutes, every one logging `old_status:Welcome Call → new_status:Welcome Call`. The webhook arrived; the handler decided to keep "Welcome Call" instead of accepting "Cancelled".

### Root cause

`supabase/functions/ghl-webhook-handler/index.ts` line **692**:

```ts
const portalOnlyStatuses = ['oon', 'do not call', 'welcome call', 'cancelled', 'canceled']
```

This list defines statuses that are **never** allowed to be overwritten by an incoming GHL webhook. The intent was to protect portal-set states like OON / Do Not Call / Cancelled from being clobbered by stale GHL echo-backs. But `'welcome call'` was added to the same list — and Welcome Call is not actually a terminal state. It means "the front-desk has reached out", not "this appointment is closed". A subsequent **Cancellation in GHL is exactly the kind of event we want to honor**, not block.

The same incorrect inclusion exists at line **634** in the reschedule guard:

```ts
const portalOnlyTerminalStatuses = ['oon', 'do not call', 'welcome call', 'cancelled', 'canceled']
```

So a GHL reschedule of a Welcome Call appointment is also being ignored today — same bug, second location.

### Fix — 3 small surgical changes

#### 1. Remove `'welcome call'` from both protection lists

`supabase/functions/ghl-webhook-handler/index.ts`:
- Line 634 — remove from `portalOnlyTerminalStatuses` so reschedules from GHL apply to Welcome Call rows.
- Line 692 — remove from `portalOnlyStatuses` so status changes from GHL (including Cancelled) apply to Welcome Call rows.

After: only `OON`, `Do Not Call`, `Cancelled`, `Canceled` remain protected from GHL overwrites — all of which **are** legitimately portal-terminal.

#### 2. Confirmed/Welcome-Call → terminal status: log a clean note

When a GHL webhook moves a row out of Welcome Call into Cancelled (or any new status), append an internal note: `Status changed from "Welcome Call" to "Cancelled" via GHL sync — Apr 21, 2026 7:10 PM`. This already happens via `handle_appointment_status_completion` audit, but adding a user-visible internal note keeps clinics from being blindsided.

#### 3. One-time reconciliation for Oralia Miller

Update appointment `2d30f3d8-a318-4ecc-ab60-77c7602f7ce9`:
- `status` → `Cancelled`
- `internal_process_complete` → `true` (trigger handles this automatically)
- Add internal note attributing the change to "GHL backfill — original cancel webhook on Apr 21 was suppressed by Welcome Call guard bug"

Then audit other Welcome Call rows where the same pattern may have suppressed a GHL cancel:

```sql
SELECT a.id, a.lead_name, a.project_name, a.updated_at
FROM all_appointments a
WHERE a.status = 'Welcome Call'
  AND a.updated_at > a.date_of_appointment - interval '7 days'
  AND EXISTS (
    SELECT 1 FROM security_audit_log s
    WHERE s.details->>'appointment_id' = a.id::text
      AND s.event_type = 'appointment_auto_completed'
      AND s.details->>'old_status' = 'Welcome Call'
      AND s.details->>'new_status' = 'Welcome Call'
      AND s.created_at > a.updated_at - interval '5 minutes'
  );
```

Any rows returned likely also had a suppressed GHL cancel — review case by case.

### Why this is safe

- Welcome Call was never meant to be terminal. `handle_appointment_status_completion` (the trigger) already includes `'welcome call'` in its IPC=true completion list, so the IPC bookkeeping is unaffected by this change.
- The other four protected statuses (`OON`, `Do Not Call`, `Cancelled`, `Canceled`) stay protected — those are explicit terminal decisions made in the portal that GHL should not overwrite.
- Cancel echo protection: GHL webhooks arriving within the existing 120s debounce window for a portal-set status are still ignored elsewhere in the handler (the `incomingStatus === existingStatus` guard at `isExplicitStatusChange`).

### Files touched

| File | Change |
|---|---|
| `supabase/functions/ghl-webhook-handler/index.ts` | Remove `'welcome call'` from `portalOnlyTerminalStatuses` (line 634) and `portalOnlyStatuses` (line 692). Add an internal-note insert when a Welcome Call row gets its status changed by a GHL webhook. |
| One-time SQL via migration | Set Oralia Miller's appointment to Cancelled + internal note. Run audit query for similar suppressed-cancel cases and report results. |
| `mem://integrations/ghl-webhook-sync-logic-v3` | Update memory: Welcome Call is **not** a portal-only terminal status; it does not block GHL status sync. |

### Risk

Low. We are removing one mistakenly-included status from two protection lists. After the change, Welcome Call behaves like Confirmed/Pending with respect to GHL sync — which is the original design intent. No schema changes.

### Approve to proceed
Approve and I'll switch to default mode, ship the handler fix, run the reconciliation for Oralia, run the audit query for similar cases, and report counts back.

