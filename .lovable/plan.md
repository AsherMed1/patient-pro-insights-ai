# AVA / Cory Hammond — GHL reschedule didn't reach the portal

## Diagnosis

Looked up the appointment by GHL contact `nGoWKhmsINAiHGUk2Zv0`:

- DB row: `id=fcbd47d0-8c6b-4c5b-a661-53fc5a75e6fb`, AVA Vascular, status **Confirmed**, date **2026-05-11 @ 16:00**, ghl_appointment_id `PFE6lf5xGCeRUslZULkh`.
- `last_ghl_sync_at`, `last_sync_source`, `last_sync_timestamp` are all NULL — this record has not been touched by any GHL sync since it was created on Apr 16.
- Searched `ghl-webhook-handler` logs for `PFE6lf5xGCeRUslZULkh`, `nGoWKhmsINAiHGUk2Zv0`, `pdt30sKeaaBubLsO1OM3`, and "Cory Hammond" — **zero hits**. Other AVA-adjacent webhooks (e.g. Apex Vascular) are arriving normally, so the handler itself is healthy.
- The most recent `appointment_update` audit entry on this row (2026-05-18 22:28) is a no-op write from our side — the new_values still show `date_of_appointment: 2026-05-11`. No payload from GHL ever landed.

Conclusion: GHL never sent us an Appointment Update webhook for this reschedule. The portal is correct given the events it received. This is a GHL workflow/automation gap on the AVA sub-account (`pdt30sKeaaBubLsO1OM3`), not a portal sync bug.

## What needs to happen

This isn't really a code change — it's a data fix plus an upstream workflow check. Two parallel actions:

### 1. Fix this specific appointment

The date has passed and the client wants to follow up with the clinic. Options (need user to pick):

- **A. Apply the reschedule retroactively**: update the row to `date_of_appointment = 2026-05-18`, `requested_time = 14:00`, append a reschedule_history entry attributed to "System (manual GHL reconciliation)", and set status appropriately (Showed / No Show / Cancelled per what the clinic reports). This will move it out of New/Needs Review.
- **B. Mark as Rescheduled** (terminal): close out the May 11 record, leave a note explaining GHL was updated but webhook never fired, then let the clinic create a fresh entry if they want one.
- **C. Leave as-is and let the agent call the clinic first**, then come back to fix once we know the outcome.

### 2. Verify AVA's GHL Appointment Update workflow

In GHL → AVA sub-account → Automation, confirm there is a workflow with trigger **Appointment Status Updated / Appointment Updated** that posts to our `ghl-webhook-handler` URL. If it's missing or paused, every AVA reschedule will silently drift. This has to be checked in GHL by someone with admin access — we can't fix it from code.

## Out of scope

- No portal code changes proposed. The handler, webhook guard, and 120s debounce all behaved correctly for the (non-)events received.
- No migration. This is a single-row fix or a workflow correction in GHL.

## Question for the user

Which path for option 1 — **A (apply reschedule now)**, **B (mark Rescheduled)**, or **C (wait)** — and do you want me to also flag the GHL workflow check to the team?
