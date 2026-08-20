# Blocked Dates → Auto-Cancel Unconfirmed: Status and Remaining Gap

## Already live in the portal

The Reserve Time Block flow already does everything in the request except the Slack hand-off:

- On Reserve, the portal scans for appointments overlapping the requested window.
- Truly unconfirmed rows only (status empty or "Pending", and never previously confirmed) are offered for auto-cancel, checked by default. Confirmed rows are never cancelled — they are either shown as FYI or the block is carved around them.
- On confirm: the block is created in GHL, each eligible appointment is set to Cancelled with reason "Auto-cancelled: Clinic blocked time", an attributed internal note is written, the cancellation is pushed to GHL, and the status webhook fires so the clinic's existing GHL workflow sends the patient SMS.
- Cancellations only run on calendars where the block actually succeeded.

The SMS content itself lives in GHL, not the portal — the portal passes the cancellation reason so a dedicated message can branch on it.

## The one piece never built

Shelly's request for a Slack alert so a caller can work the rebook queue. Nothing sends that today.

## Proposed addition

New edge function `notify-slack-block-cancellations`, modeled on the existing `notify-slack-*` functions:

- Called once per Reserve action, after cancellations complete, with the list of cancelled appointments.
- Posts a single grouped message: clinic/project, the blocked date and time window, block reason, who reserved it, and one line per patient (name, phone, original appointment time, GHL contact link).
- Fails silently — a Slack outage must never affect the block or the cancellations.
- Webhook URL stored as a secret (`SLACK_BLOCK_CANCELLATION_WEBHOOK_URL`), so the channel (e.g. #reschedule-queue) is configurable without a code change.

### Technical notes

- Invoke from `cancelConflictingAppointments` in `src/components/appointments/ReserveTimeBlockDialog.tsx`, after the loop, only when at least one appointment was cancelled.
- No schema changes. Reuse the existing `AUTO_CANCEL_REASON` constant for the message text.

## Open question

Should the alert go to one shared channel for all clinics, or route per clinic?
