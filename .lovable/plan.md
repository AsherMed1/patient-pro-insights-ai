# Blocked Dates → Auto-Cancel Unconfirmed: Status and Remaining Gaps

## Already built (verified in code)

When a clinic reserves a time block in the portal:

- The system scans for appointments overlapping the block window (same project, calendar, date, time range) and splits them into hard (confirmed), soft (unconfirmed), and coexist (double-book capacity) tiers.
- A conflict preview dialog lists affected patients with "auto-cancel and notify" pre-selected.
- On confirm, only soft-tier rows (status Pending or empty, never previously confirmed) are cancelled, and only on calendars where the block actually applied.
- Each cancellation sets `cancellation_reason = "Auto-cancelled: Clinic blocked time"`, writes an attributed internal note, syncs the cancellation to GHL via `update-ghl-appointment`, and fires `appointment-status-webhook` so the clinic's GHL workflow sends its cancellation SMS.
- Confirmed appointments are never touched; the block is carved around them instead.

So the core of Dean's request — auto-cancel, GHL sync, patient SMS trigger — is live. Two items from the thread are not built.

## Gap 1: Slack alert for a caller to work the rebook

Shelly asked for these to land in a channel so a caller can follow up. Nothing is sent today.

Add a `notify-slack-block-cancellations` edge function, modelled on the existing `notify-slack-short-notice` function, posting one grouped message per block submission:

- Clinic / project name, who reserved the block and the reason
- Blocked date and time ranges
- A line per cancelled patient: name, phone, original appointment time, calendar, and a GHL contact deep link
- Fired after the cancellations finish, best-effort, never blocking the block creation

The webhook URL goes in a secret (`SLACK_BLOCK_CANCELLATIONS_WEBHOOK_URL`).

## Gap 2: Reschedule workflow tags on the GHL contact

Today these cancellations only carry the free-text reason, so GHL workflows can't branch on them. Route them through the existing `pushLifecycleTags` helper so each auto-cancelled contact gets:

- `cancelled-portal` (workflow trigger)
- `cancel-reason-clinic-blocked-time`
- `reschedulable` (these patients should always be rebooked)

That gives the clinic a clean trigger for a block-specific SMS instead of the generic cancellation message, which answers the "lock in the SMS message" thread — the copy stays in GHL, but it can finally be a dedicated message.

## Technical notes

- Changes are confined to `src/components/appointments/ReserveTimeBlockDialog.tsx` (`cancelConflictingAppointments`) plus one new edge function.
- No schema changes.
- Tag push and Slack post are both fire-and-forget; failures are logged and never block the cancellation or the block itself.
- The existing soft-tier guard (refuse anything confirmed or previously confirmed) stays untouched.
