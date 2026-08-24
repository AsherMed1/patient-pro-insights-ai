# Welcome Call Attempt workflow

Documented, repeatable Welcome Call outreach logging for clinics, with compliance reporting for PPM. Nothing here touches appointment status.

## Clinic experience

A **Welcome Call attempt** button sits in the Internal Notes header of the patient record (and on the appointment card), exactly where the screenshot shows it.

The dialog is deliberately minimal:

- Outreach method: **Call** (fixed, shown as a locked value)
- Outcome: **Patient Answered** or **Patient Did Not Answer** (required)
- **Internal note** — mandatory, save stays disabled until text is entered
- Previous attempts listed underneath (outcome, note, who, when) so the next caller has context

Every save creates a new historical entry — attempts are never overwritten, and unlimited attempts are allowed.

### Patient Did Not Answer
- Logs the attempt + internal note.
- Fires the Welcome Call SMS through GoHighLevel.
- Appointment stays exactly as it is: no cancel, no completion, no workflow block.
- Further attempts can be logged any time.

### Patient Answered
- Logs the attempt + internal note.
- No SMS.
- Welcome Call state becomes **Successfully Reached**.

### SMS safeguard
The no-answer SMS is only triggered once per patient per rolling 12 hours. A suppressed send still logs the attempt and writes an internal note saying the SMS was skipped due to the cooldown, so the audit trail stays honest.

## Welcome Call states

Derived on the appointment record and shown as a badge:

| State | Meaning | Visibility |
| --- | --- | --- |
| No Attempt Logged | nothing documented | PPM users only |
| Attempted – Not Reached | one or more attempts, never answered | everyone |
| Successfully Reached | an answered attempt exists | everyone |

Moving to Successfully Reached keeps the full attempt history intact.

## Reporting (admin)

A **Welcome Calls** report, filterable by clinic and date range, covering: total confirmed appointments, appointments with at least one attempt, no attempt logged, attempted–not reached, successfully reached, attempt rate, successful contact rate, average attempts per patient, and attempts broken down by clinic user with timestamps. Rows drill into the patient record; export to Excel.

Because state is derived per appointment, this can later be cross-tabbed against show / no-show / cancellation / recapture outcomes.

## Technical detail

**Data**
- Reuse `public.appointment_contact_attempts` with `source = 'welcome_call'`, `channel = 'call'`, `outcome` in `answered` | `no_answer`, mandatory `note`, plus `user_id` / `user_name` / `attempted_at`. Patient, project and appointment context come from the `appointment_id` FK.
- Migration adds derived columns on `all_appointments`: `welcome_call_state` (text, default `none`), `welcome_call_attempt_count` (int default 0), `welcome_call_first_attempt_at`, `welcome_call_last_attempt_at`, `welcome_call_reached_at`, `welcome_call_last_sms_at` (cooldown clock). Maintained by an `AFTER INSERT` trigger on `appointment_contact_attempts` so reporting reads plain columns.
- Note: this is separate from the existing `welcome_call_completed` / `il_completed` cancellation-dialog fields; those stay as-is.

**Frontend**
- New `src/components/appointments/WelcomeCallAttemptDialog.tsx` (own component rather than overloading `LogAttemptDialog`, whose channel/outcome sets are setter-oriented). On submit: insert the attempt, insert the mirrored `appointment_notes` row with `visibility: 'internal'` and `by {userName}` attribution, then invoke the SMS function when outcome is `no_answer`.
- Button + state badge rendered in `AppointmentNotes.tsx` header, `DetailedAppointmentView.tsx`, and `AppointmentCard.tsx`. `No Attempt Logged` badge is gated behind the management/PPM role check from `useRole`.
- New `src/components/admin/WelcomeCallReport.tsx` added to the admin reports area, aggregating from the new derived columns + attempt rows, reusing the existing Excel export helper.

**Backend**
- New edge function `trigger-welcome-call-sms`: validates the caller JWT, re-checks the 12h cooldown server-side against `welcome_call_last_sms_at`, then adds a `welcome-call-no-answer` tag to the GHL contact (same pattern as `update-ghl-contact-tags`) which drives the SMS workflow in GHL, and stamps the cooldown column. Message copy (`{{contact.first_name}}`, `{{clinic_name}}`, `{{clinic_phone}}`) lives in the GHL workflow template — the portal only triggers it.
