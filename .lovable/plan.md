## Diagnosis

Lawrence Luczak (ID `e244f4f0`) has exactly one row in `all_appointments`, still showing **Jul 14, 2026 10:00 AM / Confirmed**. There is:
- No second row for Jul 21 2pm
- No entry in `appointment_reschedules` for this appointment
- No `ghl-webhook-handler` log line mentioning the contact ID `EUJGITfwAybixl8FV1kp`, the appointment ID `Mo9FPJRnC9CptLzUbeHS`, or the name "Luczak"

So the reschedule that was done in GHL **never fired a webhook to our portal**. That's why the portal still shows Jul 14. This is not a filter/display bug — the data update simply never arrived.

For Joint & Vascular Institute (GHL location `C6etkGtlZEebh0Qgedph`), the "Appointment Updated / Rescheduled" workflow in GHL is either missing, disabled, or not wired to our webhook URL. Our handler already supports reschedule payloads (it updates `date_of_appointment` + `requested_time`, resets status to Confirmed, sets IPC=false, and appends to `reschedule_history`) — it just never got called.

## Plan

Two-part fix: unblock this patient now, then close the gap so it stops happening.

### 1. Manually correct Lawrence Luczak's record

Update `all_appointments` row `e244f4f0-7ca8-4deb-bd0c-ca1df7db48eb`:
- `date_of_appointment` → `2026-07-21`
- `requested_time` → `14:00:00`
- `status` → `Confirmed` (unchanged)
- `internal_process_complete` → `false` (re-queue for EMR since the date moved)
- `updated_at` → `now()`

Add an `appointment_notes` row: "Manually rescheduled from Jul 14, 2026 10:00 AM to Jul 21, 2026 2:00 PM to match GHL. GHL webhook for the reschedule was not received." — attributed to the acting user via the standard "by {userName}" pattern.

Append a `reschedule_history` entry (JSONB on `all_appointments`) matching the shape used by the reschedule flow so the timeline shows the move.

Fire `appointment-status-webhook` so downstream (clinic notification) sees the new date/time, matching what the normal reschedule path does.

### 2. Close the GHL-side gap (no portal code change, action item for you)

Because our handler works correctly when it receives a reschedule payload, the fix on the JVI sub-account is to confirm in GHL:

- The workflow that fires on **Appointment Updated / Rescheduled** exists on `C6etkGtlZEebh0Qgedph`
- It's **published/active**
- Its webhook step points to our `ghl-webhook-handler` URL, same as the "Appointment Created" workflow

If you want, I can also add a lightweight one-time backfill step: for JVI, compare our portal appointments vs GHL calendar events for the next 30 days and flag mismatches so we can catch other silently-rescheduled patients. Say the word and I'll include it.

### Technical details

- File touched: none in the frontend. Backend action is a targeted SQL update + note insert + webhook invoke, run once.
- No schema changes.
- No changes to `ghl-webhook-handler` — its reschedule path is already correct per the "Reschedule System Logic" and "GHL Duration Preservation" memories.
