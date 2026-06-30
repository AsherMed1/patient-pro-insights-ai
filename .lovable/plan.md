## What I found

Meelah Noell (Vivid Vascular, appt `5c7a80e3…`, GHL appt `tgsGLHtI6dsrsXbYCAj5`) is sitting at `status='OON'` in the database — but:

- Zero rows in `appointment_notes` for this appointment (the "Status changed to OON" system note never wrote).
- Every `security_audit_log` entry for this row shows `old_status: OON → new_status: OON`.
- No `notify-slack-oon`, `appointment-status-webhook`, or `update-ghl-appointment` logs reference it.

### Root cause

In `AllAppointmentsManager.tsx` `handleStatusChange`, the OON side effects (Slack alert + `appointment-status-webhook` that fires VIVID's GHL workflow + the system note) are **all gated on `oldStatus !== status`** (line 752). The unconditional `update-ghl-appointment` call right above does run, but that only PATCHes `appointmentStatus='cancelled'` on the GHL event — it does NOT fire the workflow that sends the OON SMS/cancellation.

For Meelah the row was already at `OON` before Ivy clicked OON in the portal (most likely an earlier silent set — sheet sync / webhook race / earlier click that failed mid-flight). So every retry just no-ops the side-effects branch. Slack stays silent, the GHL workflow never runs, and from VIVID's POV nothing happens.

This is a class bug — it will keep biting anyone who clicks OON on a row that's somehow already OON, and the UI gives no clue why.

## Fix

### 1. `src/components/AllAppointmentsManager.tsx` — let OON (and Do Not Call) re-fire

In `handleStatusChange`, pull the **OON block** and the **Do Not Call DND block** and the **`appointment-status-webhook` call** out of the `if (oldStatus !== status)` gate. Keep the system-note write gated (we don't want duplicate "changed from OON to OON" notes), but instead write a "Re-triggered OON workflow by {user}" note on the re-fire path so the audit trail explains why Slack pinged again.

Concretely:

```text
if (oldStatus !== status) {
  write "Status changed from X to Y" system note
}

// always runs when the user explicitly picks these:
if (status === 'OON') { fire notify-slack-oon + appointment-status-webhook, write re-fire note if oldStatus===status }
if (status === 'Do Not Call') { fire DND + write DO NOT CALL note (dedupe if already present) }
```

`update-ghl-appointment` already runs unconditionally — leave it.

### 2. Recover Meelah Noell right now

After the code fix ships, Ivy can just re-click OON on the row and everything fires. But to unblock her without waiting:

- Invoke `notify-slack-oon` directly with Meelah's payload (firstName=Meelah, lastName=Noell, project=Vivid Vascular, calendar=UFE Aventura, appointmentId=`5c7a80e3-edbc-489c-960f-3c9029b6c998`).
- Invoke `appointment-status-webhook` with `old_status='Confirmed'`, `new_status='OON'` for the same id — this is the call that hits VIVID's GHL workflow URL (`…/hooks/R7WRMPd1zyAxkp8WCZZo/webhook-trigger/2pTY4eHeBOgdU8Sg5rMr`) and is what actually cancels the appt + sends the OON message in GHL.
- Write the missing "Status changed to OON by Ivy" note on `appointment_notes` so the row has an audit trail.

I'll do this from a one-shot recovery utility (kept under `src/utils/`) that an admin can run once from the browser console, mirroring the pattern of the other one-shot recovery utils already in the project.

## Why not change the DB / Review Queue path

The Review Queue OON flow is already correct (fires Slack + webhook in `ReviewQueue.tsx`). This bug is specific to the All Appointments status dropdown, which is what the user uses on the portal. No schema or RLS changes needed.

## Out of scope

- Why the row reached OON without firing side effects in the first place (likely a separate race — happy to investigate after we recover Meelah and unblock the re-fire path).
