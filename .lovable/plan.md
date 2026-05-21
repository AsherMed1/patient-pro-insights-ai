## Root cause

Mary Braxton's appointment was marked OON via the **Review Queue**, but that path doesn't fire the same side effects as the appointment-card status dropdown.

`src/components/admin/ReviewQueue.tsx` `performAction()`:
1. Sets `status = 'OON'` in the DB — works.
2. Calls `notify-slack-status-change` — **this edge function does not exist** (only `notify-slack-oon`, `notify-slack-review-queue`, etc.). The Slack alert silently fails.
3. **Does NOT call `appointment-status-webhook`** — this is the function that POSTs to the project's `appointment_webhook_url`, which is what triggers the GHL OON workflow on the contact/opportunity.

So when OON is set from the queue: DB is updated, but no Slack alert fires and no outbound webhook hits GHL → opportunity is not updated and the OON workflow never runs.

The appointment-card dropdown path (`AllAppointmentsManager.updateStatus`) does both correctly (lines 838–869 fire `notify-slack-oon`, lines 872+ fire `appointment-status-webhook`).

## Fix

Update `ReviewQueue.performAction()` so the `action === 'oon'` branch mirrors the appointment-card OON path:

1. Replace the broken `notify-slack-status-change` invocation with `notify-slack-oon`, passing the payload it expects (`firstName`, `lastName`, `phone`, `calendarName`, `projectName`, `appointmentId`). Fetch the missing fields (`lead_phone_number`, `calendar_name`) alongside the existing `priorRow` select.
2. After the DB update, fire-and-forget `appointment-status-webhook` with `{ appointment_id: id, old_status: priorRow.status, new_status: 'OON' }` so the GHL OON workflow runs.
3. Also write a system note to `appointment_notes` (`Status changed from "<old>" to "OON" by <user>`) so the queue path leaves the same audit trail as the dropdown path.

## Backfill Mary Braxton

After the fix, manually re-trigger the workflow for the existing record (appointment id `93b05469-58e4-4c86-8304-09f0a9133f20`) by invoking `appointment-status-webhook` once with `old_status: 'Confirmed'`, `new_status: 'OON'`, and re-firing `notify-slack-oon`. I'll do this from the chat after you approve.

## Files to change

- `src/components/admin/ReviewQueue.tsx` — rewrite the OON side-effect block in `performAction`.

No DB migration, no new edge functions.
