## Answers to the two questions (Champion Heart and Vascular Center)

**1. How long does it take for an overdue appointment to enter "Needs Review"?**

Confirmed by reading the query that builds the tab (`src/components/AllAppointmentsManager.tsx`, lines 312-324 and 450-462): the filter is `date_of_appointment.lt.<today>`, where `<today>` is midnight of the *viewer's browser day*. `requested_time` is never used.

So an appointment does **not** move into Needs Review when its scheduled time passes — it moves at the next midnight. An 8:30 AM appointment sits outside Needs Review for ~15.5 hours; a 4:00 PM one for ~8 hours. That is the reported "taking longer than expected". It is a date-only comparison, not a delay in a sync job.

Second, narrower factor: the tab excludes every terminal status but keeps non-terminal ones, so a past-dated appointment left as `Confirmed` or `Welcome Call` does surface — but only after that same midnight rollover.

**2. Can status be updated from inside Needs Review without an error?**

Not confirmed yet. I inspected the update path (`src/utils/appointmentStatusChange.ts`) and found three distinct things that all surface as red toasts, and I can't tell from code alone which one Champion is hitting:
- `Status update blocked` — the row update returned 0 rows (RLS).
- `GHL Sync Warning` — DB save succeeded but `update-ghl-appointment` failed. GHL commonly rejects edits on past-dated appointments, which is exactly the population living in Needs Review.
- `Failed to update appointment status` — a thrown DB error, e.g. from one of the 20 triggers on `all_appointments`.

Recent `update-ghl-appointment` logs for Champion show successes plus 422 `user id not part of calendar team` errors on other projects, so the GHL path is a live suspect. Verification is step 1 of the plan below.

## Plan

### Step 1 — Reproduce and identify the exact error (do this first)
- Sign into the portal as a Champion-scoped user, open Appointments → Needs Review, change a status, and capture the toast text, browser console output, and the `update-ghl-appointment` / `appointment-status-webhook` edge logs for that attempt.
- Classify the failure into one of the three buckets above before changing anything. No fix ships in this step.

### Step 2 — Make Needs Review time-aware
Replace the date-only cutoff with an appointment-time cutoff in both the count query and the data query:
- Compute the cutoff as "now" in the project's timezone rather than browser midnight.
- Include a row when either `date_of_appointment < today` (unchanged) **or** `date_of_appointment = today AND requested_time <= now`.
- Mirror the same rule in the client-side helper `isAppointmentInPast` / `filterAppointments` (`src/components/appointments/utils.ts`) so counts and list contents agree.
- Optionally add a small grace window (e.g. 30 minutes past the scheduled start) so an in-progress appointment doesn't flag while the patient is still in the room. I'd suggest 30 minutes unless you want it instant.
- Keep the same terminal-status exclusions and the `is_unscheduled` / `is_superseded` handling exactly as they are.

### Step 3 — Fix the error found in Step 1
Depending on the classification:
- **RLS (0 rows):** correct the policy or the role assignment for the Champion users.
- **GHL rejection on past appointments:** treat "appointment already in the past" as a non-blocking outcome — save locally, log it, and downgrade the red toast to an informational one, so clinic staff aren't told the update failed when it actually saved.
- **Trigger error:** fix the offending trigger and re-test.

### Step 4 — Verify
- Re-run a status change from Needs Review for a Champion appointment and confirm a clean success toast, the row leaves the tab, and the GHL side reflects the new status.
- Spot-check that a same-day appointment whose time has passed now appears in Needs Review without waiting for midnight, and that the tab badge count matches the rows listed.

## Technical notes
- Files touched: `src/components/AllAppointmentsManager.tsx` (both tab query blocks), `src/components/appointments/utils.ts`, and possibly `src/utils/appointmentStatusChange.ts` for the toast severity.
- No database migration is needed for Step 2; `requested_time` already exists on `all_appointments`.
- Project timezone is already available via `src/utils/projectTimezoneCache.ts`, used by the short-notice alert logic.
