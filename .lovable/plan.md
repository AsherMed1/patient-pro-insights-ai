## Goal

In the Cancel Appointment pop-up, require the setter to answer **Was a Welcome Call completed? (Yes / No)** before confirming, and add an **Other** option under the *Do Not Reschedule* reason group.

## What changes

**1. Welcome Call question (required)**
- New Yes/No radio group at the top of the dialog, above the reason list, matching the mockup.
- Confirm Cancellation stays disabled until Yes or No is selected (alongside the existing reason and Other-notes requirements).
- Resets when the dialog closes.

**2. "Other" under Do Not Reschedule**
- Displayed label: "Other" in the Do Not Reschedule group; stored value `Other (Do Not Reschedule)` so it stays distinct from the existing reschedulable "Other".
- Both Others require notes.
- The Do-Not-Reschedule branch (GHL DND enable + `do-not-reschedule` tag) fires for the new option, exactly like the other reasons in that group.

**3. Recording the answer**
- Saved to a new `welcome_call_completed` boolean column on `all_appointments` (nullable — existing rows stay `null`, meaning "not asked").
- Also written into the cancellation note and the GHL cancellation note text, e.g. `Cancellation Reason: Scheduling Conflict. Welcome Call completed: Yes. Notes: ...`, so it shows in the portal activity timeline and in GHL.

## Where

The cancellation dialog exists in two places and both are updated identically:
- `src/components/appointments/AppointmentCard.tsx` (dialog around line 2253, submit handler `handleCancelSubmit` line 706, reason arrays lines 688-704)
- `src/components/appointments/DetailedAppointmentView.tsx` (dialog around line 1423, inline submit handler, inline reason arrays lines 1436-1456)

The reason lists and the "is this a do-not-reschedule reason" test are currently duplicated across both files. They will be extracted into a small shared module (`src/components/appointments/cancellationReasons.ts`) so the two dialogs can't drift again.

## Not included

- No change to the Review Queue decline flow (separate reason set, `declineReasons.ts`).
- No new GHL tag for the Welcome Call answer — say the word if you want one (e.g. `cancelled-during-welcome-call`) for workflow branching.
- No reporting/export column for the new field yet.

## Technical notes

One migration adds `welcome_call_completed boolean` to `all_appointments`. Everything else is frontend: shared reason constants, two dialog updates, and the note/GHL string builders.
