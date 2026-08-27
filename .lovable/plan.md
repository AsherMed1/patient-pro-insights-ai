# Add Welcome Call Attempt to the Portal Training Guide

Clinics learn the portal through the guided **Portal Tour** (Help > Portal Tour). It currently has 12 steps and says nothing about Welcome Call attempt logging, which now sits in the Internal Notes header of every patient record.

## What changes

Add a dedicated tour step, shown right after the Internal Notes step, highlighting the Welcome Call attempt button and badge on the patient record.

Step content:

- **Title:** Logging a Welcome Call
- **Body:** Use *Welcome Call attempt* in the Internal Notes header to document every welcome call. Pick **Patient Answered** or **Patient Did Not Answer**, add a required internal note, and save. Answered marks the patient as *Successfully Reached*; Did Not Answer keeps the record open and automatically triggers the patient follow-up text (once per 12 hours). Attempts are never overwritten — the badge shows the current state and attempt count, and past attempts are listed in the dialog for the next caller. Logging an attempt never changes the appointment status.

Also extend the existing Internal Notes step slightly so the two read as one flow, and update the closing step count wording if needed (it doesn't mention a count today, so no change expected).

## Technical detail

- Add `data-tour="welcome-call-attempt"` to the wrapper around `WelcomeCallAttemptControl` in `src/components/appointments/AppointmentNotes.tsx` (header row, line ~174).
- Insert a new step in `src/components/tour/portalTourSteps.ts` after the `internal-notes` step, with `anchor: 'welcome-call-attempt'`, `section: 'appointments-list'`, `placement: 'bottom'`.
- Steps whose anchor is missing are skipped automatically, so clinics without a visible record on screen are unaffected — no other changes needed.
