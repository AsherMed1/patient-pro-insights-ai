# No-Show Reschedule Eligibility

When a clinic marks an appointment **No Show**, prompt for an eligibility decision, and when the patient is marked ineligible, block them from recapture and future scheduling everywhere, warn on the record, and hand off the patient text to a GHL workflow via tag.

## 1. Eligibility prompt on No Show

Mirror the existing Cancelled-reason dialog pattern in `AppointmentCard.tsx` and `DetailedAppointmentView.tsx`: selecting **No Show** opens a dialog with two radio options plus an optional notes box.

- Eligible for rescheduling (default)
- Not eligible for rescheduling — patient must contact the clinic directly

The status still saves as `No Show` exactly as today, so existing no-show reporting and status workflows are untouched.

## 2. Data model

New columns on `all_appointments`:
- `reschedule_eligible boolean` (null = never asked)
- `reschedule_block_reason text`
- `reschedule_blocked_at timestamptz`, `reschedule_blocked_by text`

New table `patient_reschedule_blocks` — the patient-level source of truth, keyed on `ghl_contact_id` + `project_name`, with reason, blocked_by, active flag, timestamps, plus RLS and grants matching the existing appointment tables. Blocks are patient-level as requested, so the flag follows the contact across appointments in that project.

## 3. Effects when "Not eligible" is chosen

- **Internal note**: appointment note `Marked ineligible for rescheduling after no-show by {user}` (with any extra notes), using the existing attribution helper.
- **GHL tag**: add `no-show-not-eligible` (and `do-not-reschedule`, matching the existing cancellation path) to the contact via `update-ghl-contact-tags`. Your GHL workflow fires the patient SMS off that tag, so the message copy and the clinic phone stay in GHL where the location phone already lives.
- **Recapture**: `link_recapture_on_active()` is updated to skip linking a new appointment to a lost one when an active block exists for that contact/project, so ineligible patients never enter the recapture queue or dashboard.
- **New bookings**: `ghl-webhook-handler` looks up the block when creating an appointment for a blocked contact — the appointment is still stored (so nothing silently disappears) but flagged blocked and marked so it does not auto-approve; it surfaces in the Review Queue with a red "Reschedule Blocked" badge for admin decision. This is the single choke point that covers setters, AI and self-booking, since all of them arrive through GHL.
- **Portal UI warning**: a red banner on the appointment card and detail view — "Not eligible for rescheduling — patient must contact the clinic directly" plus reason and who set it. Reschedule/date-edit controls are disabled on blocked patients.

## 4. Unblocking

Admins can lift a block from the detail view ("Allow rescheduling again"), which deactivates the block row, removes the GHL tags, and writes an attributed note.

## Technical notes

- Migration: two column sets + new table with GRANTs and RLS, plus updated `link_recapture_on_active()`.
- Front-end: new `NoShowEligibilityDialog` component reused by `AppointmentCard.tsx` and `DetailedAppointmentView.tsx`; block lookup added to the appointments fetch so the badge/warning renders without an extra round trip per row.
- Edge: `ghl-webhook-handler` block check; no new secrets and no SMS provider needed — the text is sent by your GHL workflow off the tag, using the GHL location's own phone number.

## Your side (GHL)

Create one workflow per sub-account triggered by the `no-show-not-eligible` tag that sends:

```text
Hi {{contact.first_name}}, due to your previous missed appointments, please contact {{location.name}} directly at {{location.phone}} if you would like to schedule another appointment. Thank you.
```
