# Lisa Lowe — cancelled in portal, still booked in GHL

## What the records show (verified)

- One row exists: Lisa Lowe, Nashville Vascular & Vein Institute, appointment 2026-07-29 09:40, GHL contact `KhhltTqvA19Kb4mTLDpe`, GHL event `vCVLnRCjPn8B7uaz5962`, status `Cancelled`.
- Timeline: row created 2026-07-01 23:17:49 UTC as `Confirmed`; 36 seconds later the only note on the record says `Status changed from "Confirmed" to "Cancelled" via GoHighLevel`. The row was touched again on 2026-07-02 14:14 but stayed Cancelled.
- No user, no portal audit entry, no cancellation reason — nobody in the portal cancelled her. The change came from an inbound GoHighLevel webhook.
- There is no second row and no reschedule history for this contact, so GHL never sent a replacement booking event that the portal ignored.

So the answer to "why was this cancelled in the portal" is: an inbound GHL webhook carried a cancelled appointment status for event `vCVLnRCjPn8B7uaz5962` half a minute after the booking landed, and the portal applied it. Once a row is `Cancelled`, the portal's terminal-status guard blocks every later GHL update from re-confirming it — which is why the portal stayed wrong while GHL kept messaging the patient.

What we cannot yet prove from the database alone is *which* payload sent that cancel (a genuine GHL cancel event, a workflow-format payload whose `calendar.status` was stale, or a slot edit GHL reports as cancelled). Raw webhook payloads are not stored anywhere, so step 1 below is to verify against GHL and start capturing payloads.

## Plan

1. Verify against GHL: read the live status of event `vCVLnRCjPn8B7uaz5962` through the project's GHL API key. If GHL says confirmed/booked, the portal cancel was spurious.
2. Restore Lisa Lowe: set the row back to `Confirmed`, keep the appointment date/time, and write an audit note explaining the correction (no GHL write needed if GHL was never cancelled).
3. Capture evidence going forward: add a `ghl_webhook_events` table and log every inbound payload (contact id, appointment id, detected format, raw JSON, resulting action) from `ghl-webhook-handler`, with a short retention window. Without this, the next occurrence is again undiagnosable.
4. Harden the cancel path in `ghl-webhook-handler`:
   - Only accept a cancel when the payload is an appointment-shaped event whose `ghl_appointment_id` matches the row being cancelled. Workflow/contact-shaped payloads that carry a status but no matching appointment id must not flip a row to Cancelled.
   - Add a "fresh booking" guard: a cancel arriving within a few minutes of row creation for an appointment still in the future is held and re-verified against the GHL appointment endpoint before being applied; if GHL still reports the event as booked/confirmed, the cancel is discarded and logged.
5. Sweep for other victims: find rows cancelled by GHL with a future appointment date and no portal user involvement, check each against GHL, and produce a list of mismatches for review before any bulk correction.

## Technical notes

- Cancel is applied in `supabase/functions/ghl-webhook-handler/index.ts` in `getUpdateableFields` (status branch around line 1506) and normalized by `normalizeStatus`.
- `extractWorkflowFormat` reads `calendar.status || payload.status`, while `extractStandardEventFormat` reads `apt.appointmentStatus || apt.status` — the workflow path is the weaker one and the likely candidate for a bad cancel.
- The terminal-status guard that preserved `Cancelled` against later GHL updates stays as-is; the fix is to stop bad cancels from being written, not to loosen the guard.
