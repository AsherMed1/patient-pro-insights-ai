

## Apex – Tammie Huckeby Investigation

### What's actually happening
Tammie has **two separate GHL appointments** under one contact (`YMcGnc1qX3JSMc9meHuD`) — this is correct, not a duplicate profile. Each GHL appointment becomes its own portal record because they have distinct `ghl_appointment_id`s:

| Record | GHL Appt ID | Service | Date | Status |
|---|---|---|---|---|
| Old | `1EAGN7Qkm0jPxoq11tOa` | Neuropathy (Crossville) | Apr 21, 3:15 PM | **Cancelled** ✅ |
| New | `877CPabkwyZwkUDdRI45` | GAE (Crossville) | May 19, 2:00 PM | **Confirmed** ✅ |

Both records reflect the correct status — the Apr 21 appointment IS marked Cancelled in the portal as of Apr 16, 20:09 UTC.

### The real problem — the "alert"
The Apr 21 cancelled appointment is **still sitting in the EMR Processing Queue with `status='pending'`** even though the underlying appointment is Cancelled (IPC=true).

**Root cause:** The DB trigger `auto_queue_confirmed_appointment` correctly inserts into `emr_processing_queue` when an appointment becomes Confirmed, but **no trigger removes the queue entry when the appointment later moves to a terminal status** (Cancelled, No Show, OON, Rescheduled, Do Not Call). The EMR queue UI (`useEmrQueue`) just selects everything `WHERE status='pending'` with no join-side filter on `all_appointments.status`.

**This is systemic, not isolated to Tammie.** Confirmed query: **4,653 stale pending EMR queue rows** exist across all projects where the appointment is already terminal.

### Fix

**1. Add a DB trigger that auto-resolves EMR queue entries when an appointment becomes terminal**
New trigger on `all_appointments` AFTER UPDATE OF status — when new status is in (cancelled, no show, oon, do not call, rescheduled, won), update the matching `emr_processing_queue` row to `status='completed'` with a system note `"Auto-resolved: appointment {status}"` and `processed_at = now()`.

**2. One-time backfill cleanup** for the 4,653 existing stale rows — mark them `completed` with note `"Auto-resolved: appointment {status} (backfill)"`.

**3. UI safety net** in `useEmrQueue.tsx` — also filter the `pending` query so any appointment with terminal status is excluded even if the trigger missed it (defense in depth).

### Files / changes
- **Migration** — new trigger function `auto_resolve_emr_queue_on_terminal_status()` + trigger on `all_appointments`
- **Insert SQL** — backfill `UPDATE emr_processing_queue SET status='completed'` for stale rows
- **`src/hooks/useEmrQueue.tsx`** — exclude terminal-status appointments from pending query

### Result
- Tammie's Apr 21 record drops out of Apex's EMR queue immediately
- All 4,653 stale entries across all projects get auto-resolved
- Future cancellations / no-shows / reschedules auto-clean themselves from the queue
- The two profiles in the portal remain (correct — they're two distinct GHL appointments)

### Memory update
Add a core rule: "Terminal status changes auto-resolve EMR processing queue entries (pending → completed)" alongside the existing terminal-status rules.

