## Context

Portal shows Earl A Chestnut on **Jul 30, 10:30 AM ET**. GHL shows **Jul 31, 11:30 AM ET**. Audit trail confirms the portal record was **not** manually edited after creation — no reschedule entries, empty `reschedule_history`, only the initial webhook + Review Queue approval touched it. This is a missed "Appointment Updated" webhook from GHL, same pattern as Lawrence Luczak and Sarella Kately.

## Plan

1. **Confirm GHL is authoritative for Jul 31 11:30**
   - Fetch appointment `DfDOfeHtPiBTM0ytTRmT` directly from GHL via `backfill-ghl-appointment` (or a one-shot fetch) using Champion Heart and Vascular Center credentials.
   - Record the current `startTime`, `endTime`, `appointmentStatus`.

2. **Check whether the reschedule webhook ever arrived**
   - Scan `ghl-webhook-handler` edge function logs for `DfDOfeHtPiBTM0ytTRmT` between Jul 22 17:07 UTC and now.
   - Three possible outcomes:
     - a) No log entry → GHL never delivered the webhook. Repair only.
     - b) Log entry, but skipped by a guard (`isLikelyNotesOnlyPayload`, `hasRealDate`, terminal-status protection, superseded row, review-queue snapshot freeze, etc.) → repair + patch the guard.
     - c) Log entry, accepted, but wrote to a different row → repair + investigate row matching.

3. **Repair Earl's portal record**
   - Invoke `backfill-ghl-appointment` with `projectName: "Champion Heart and Vascular Center"` and `contactIds: ["kONqteQAha8EppZkpnEH"]`. That synthesizes a fresh `AppointmentCreate` payload for the current GHL state and routes it through `ghl-webhook-handler`, which will update `date_of_appointment`, `requested_time`, and log a proper reschedule.
   - Verify the row now shows Jul 31 11:30 ET (stored as `15:30 UTC`) and that `qa_cases.appointment_date` for the linked case reflects the new time (should happen automatically via the fixed ingest triggers from the previous turn).

4. **If step 2 revealed a guard rejection, patch it**
   - Only edit the specific guard that dropped the reschedule. No speculative changes.

5. **Report findings**
   - Whether the webhook arrived, which path dropped it (if any), what was changed, and the final portal state vs GHL.

## Out of scope

- No changes to review-queue snapshot behavior, terminal-status protection, or echo-back debounce unless step 2 proves one of them dropped this specific reschedule.
- No bulk backfill of other patients — this is a targeted repair for Earl only.
