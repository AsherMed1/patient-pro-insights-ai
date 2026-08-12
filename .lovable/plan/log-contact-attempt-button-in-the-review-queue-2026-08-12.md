# Log Contact Attempt button in the Review Queue

## How it works today

"Last contact" is derived purely from portal notes. The queue reads the most recent `appointment_notes` row for the record and ignores anything that looks system-generated (author "System"/"Review Queue"/"Support"/automation, or text starting with "Review queue:", "Status changed", "System:", "Auto"). It does **not** read GHL call logs. So you're right: if a setter calls and doesn't write a note, the record looks untouched and eventually flags "Needs follow-up" incorrectly.

There is call data in the portal (`all_calls`, synced from GHL by phone number), but nothing currently connects it to the Last contact badge.

## What to build

### 1. "Log attempt" button on the record

A compact button on each Pending Review row (and in the appointment detail view) opens a small dialog:

- **Channel** — Call, SMS, Email, Voicemail
- **Outcome** — No answer, Left voicemail, Reached patient, Wrong number, Callback requested
- **Note for the next setter** (optional free text)

Submitting records the attempt with who logged it and when, and writes a matching internal note on the appointment so the note history stays complete and other setters see the context.

### 2. Attempt drives the "Last contact" badge

The badge switches to the latest logged attempt, showing channel + outcome, e.g. `Last contact 2h ago · Call, no answer · Anyira`. A logged attempt always wins over a plain note; if no attempt exists yet, the current note-based fallback still applies so nothing regresses.

The 24-business-hour "Needs follow-up" warning resets on a logged attempt.

### 3. Attempt count on the row

A small counter (`3 attempts`) so a setter can see at a glance how much has already been tried, with the full attempt history (channel, outcome, note, who, when) visible in the record detail view.

### 4. Passive GHL call signal

As a safety net, outbound calls already synced from GHL into `all_calls` that match the patient's phone within the pending window count as an implicit attempt (labelled "GHL call") when no manual attempt is newer. This covers setters who call without logging.

## Technical notes

- New table `public.appointment_contact_attempts`: `id`, `appointment_id` (FK `all_appointments`), `attempted_at` (default now), `channel`, `outcome`, `note`, `user_id`, `user_name`, `source` (`manual` | `ghl_call`). Grants for `authenticated` + `service_role`, RLS mirroring the existing `appointment_notes` access model (project access or management/setter roles).
- New component `src/components/appointments/LogAttemptDialog.tsx`, reused by `ReviewQueue.tsx` rows and `DetailedAppointmentView.tsx`.
- `ReviewQueue.tsx`: batch-fetch latest attempt + count per row alongside the existing last-note fetch; `lastContactByRowId` resolves attempt → note → GHL call, in that order, and feeds the existing follow-up-age math in `src/lib/shortNotice.ts`.
- GHL call matching: query `all_calls` by `lead_phone_number` + `project_name` for calls after `pending_since`; read-only, no new sync work.
- On submit, also insert the mirrored `appointment_notes` row so it appears in the notes timeline attributed to the setter (not "System").
