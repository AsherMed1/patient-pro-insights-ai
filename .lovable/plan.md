# Welcome Call Attempt Workflow

## Clinic experience

A **Welcome Call attempt** button next to Add Note on every patient record (both the portal card and the detailed view). Clicking it opens a small dialog:

- Outreach method: Call (fixed, shown as a read-only chip)
- Outcome: Patient Answered / Patient Did Not Answer (required)
- Internal note: required — Save stays disabled until text is entered

Saving creates a new attempt row every time (never overwrites), mirrors the note into the notes timeline attributed to the clinic user, and shows a confirmation toast. Prior attempts are listed inside the dialog so staff see what has already been tried.

A badge on the record shows the Welcome Call state:

- **No attempt logged** — PPM users only (clinics see nothing)
- **Attempted – Not Reached** — everyone
- **Successfully Reached** — everyone

Full attempt history is retained when a record moves from Attempted to Reached.

## Patient Did Not Answer

- Attempt + mandatory note saved
- Welcome Call SMS triggered through GoHighLevel
- Appointment status, procedure status and workflow position are untouched — no cancellation, no completion, no blocking
- More attempts can be logged at any time

SMS copy lives in the GHL workflow (so `{{contact.first_name}}`, clinic name and clinic phone resolve there). The portal fires it by pushing a `welcome-call-no-answer` tag to the GHL contact, matching how the existing `approved` tag releases a GHL workflow.

**Anti-spam safeguard:** the SMS only fires if no Welcome Call SMS has been sent to that patient in the last 12 hours. Suppressed sends are logged as an internal note ("SMS suppressed — already sent X hours ago") so the audit trail is complete, and the attempt itself still saves normally.

## Patient Answered

- Attempt + mandatory note saved
- No SMS
- Contact state set to **Successfully Reached**

## Reporting

New admin-only **Welcome Call Compliance** report (inside the existing reporting area) with a clinic/date-range filter and CSV/Excel export:

- Total confirmed appointments
- Appointments with ≥1 attempt / with no attempt logged
- Attempted – Not Reached, Successfully Reached
- Welcome Call Attempt Rate, Successful Contact Rate
- Attempts per patient, clinic user who logged each attempt, timestamps

Because state and counts are stored per appointment alongside status, the same rows can later be sliced against show / no-show / cancellation / recapture outcomes without further schema work.

## Technical notes

**Data (migration)**
- Reuse `appointment_contact_attempts` with `source = 'welcome_call'`, `channel = 'call'`, `outcome in ('answered','no_answer')`; note is enforced non-empty for welcome-call rows by trigger. Clinic/patient/appointment context comes from the joined `all_appointments` row.
- RLS: add project-scoped INSERT and SELECT policies for `project_user` (and `review_only` read) via the existing `has_project_access` / `user_accessible_project_names` helpers, so clinics can log and read only their own appointments' attempts.
- New derived columns on `all_appointments`: `welcome_call_state` (`none` default / `attempted_not_reached` / `reached`), `welcome_call_attempt_count`, `welcome_call_first_attempt_at`, `welcome_call_reached_at`, `welcome_call_last_sms_at`. Maintained by an `AFTER INSERT` trigger on `appointment_contact_attempts` — never downgraded from `reached`.
- Backfill state from any existing attempt rows.

**Frontend**
- New `src/components/appointments/WelcomeCallAttemptDialog.tsx` (patterned on `LogAttemptDialog.tsx`): fixed channel, two-outcome radio, required note, history list, calls the SMS edge function on `no_answer`.
- Button + state badge added in `AppointmentCard.tsx` and `DetailedAppointmentView.tsx` notes header; badge hides the "No attempt logged" variant for `isProjectUser()`.
- Mirrored note written as `visibility: 'clinic'` (clinic-authored, visible to clinic and PPM); system SMS/suppression notes written as `internal`.

**Backend**
- New edge function `send-welcome-call-sms`: validates input with Zod, loads the appointment, enforces the 12h cooldown against `welcome_call_last_sms_at`, adds the `welcome-call-no-answer` tag via the GHL contacts API (same auth path as `update-ghl-contact-tags`), stamps `welcome_call_last_sms_at`, and writes an internal audit note. Appointment status is never modified.
- Reporting component `src/components/admin/WelcomeCallComplianceReport.tsx` querying the new columns plus attempt rows.

**Needs on the GHL side:** one workflow triggered by the `welcome-call-no-answer` tag that sends the SMS copy above and removes the tag afterwards, so repeat attempts can re-trigger it.
