# Recapture Redesign — Drawer-Based Setter Workflow

Rework Recapture to behave like QA Operations: one **Open Record** action per row, a right-side patient drawer, and a clean split between *logging an attempt* (activity only) and *setting an Outcome* (what happens to the lead).

## Buckets

| Bucket | Meaning |
| --- | --- |
| Active / New | Entered Recapture, no attempts logged yet |
| Nurture | Attempts logged, no successful contact, no follow-up scheduled |
| Follow-Up | A specific follow-up date/time is set (shows countdown) |
| Completed | Closed with a completion reason |

Movement rules:
- Logging an attempt on an Active/New record moves it to **Nurture** and never completes it.
- Outcome → Nurture keeps it workable in Nurture.
- Outcome → Follow-Up Required requires date + time, moves to Follow-Up, shows the scheduled time plus a live countdown; overdue follow-ups are visually flagged.
- Outcome → Completed requires a completion reason (Booked / Rescheduled, Not Interested, Unable to Reach, Invalid Contact Number, Other). "Other" requires a note. Only this closes the record.

## Queue table

- Columns: Patient, Clinic, Lost Type, Lost Date, Days Since, Service, Attempts, Follow-Up (date/time + countdown), Assignee, Status.
- Single action per row: **Open Record** (opens the drawer; the queue stays behind it, filters and scroll preserved).
- Bucket tabs with live counts, existing filters (search, clinic, lost type, date range) unchanged.

## Patient drawer

Header: patient name, clinic, current recapture status badge, attempt count.

Details: phone, email, service line, last appointment date/time, lost type, entered-worklist date, assignee.

Links: **Open Portal Record** (existing detailed appointment view) and **Open in GHL** (existing resolver). No tech tickets, no Control Hub, no QA-only functionality.

Actions row: **Log Attempt** button and an **Outcome** dropdown (Nurture / Follow-Up Required / Completed).

Sections:
- **Contact Attempt History** — chronological entries: date/time, setter, method, outcome, note. Follow-up and outcome events appear in the same timeline so the history reads like the example in the request.
- **Internal Notes** — internal-only notes on the case.

After saving an attempt or an outcome, the drawer stays open on the same patient and refreshes in place.

## Log Attempt

Records date/time, setter, method (Call / Text / Email / Voicemail), attempt outcome (Answered, No Answer, Left Voicemail, Busy, Disconnected, Wrong Number, Callback Requested, Not Interested, Other), and an optional note. It only writes history — it never sets a completion outcome.

## Portal visibility for PPM

On the Patient Portal appointment record, add an internal-only **Recapture Contact History** section listing attempt date/time, outcome, setter, and notes — including for patients completed as Booked / Rescheduled. Hidden from clinic users, using the same internal-visibility gating already applied to internal notes.

## Technical notes

- Migration on `recapture_cases`: widen the `work_status` check to `new`, `nurture`, `follow_up`, `completed` (mapping existing `pending`→`new`, `engaging`→`nurture`, `follow_up_required`→`follow_up`); add `follow_up_at timestamptz`, `follow_up_note text`, `completion_reason text` with a check for the five reasons. Keep `outcome`/`outcome_notes` for reporting continuity.
- New `recapture_case_notes` table (case_id, note_text, created_by, created_by_name, created_at) with GRANTs and RLS matching `recapture_attempts` (`has_recapture_case_access`), internal-only by definition.
- `src/components/recapture/RecaptureQueue.tsx`: strip the row action cluster down to Open Record; split the drawer into a new `RecaptureCaseDrawer.tsx` holding details, links, Log Attempt dialog, Outcome dialog(s), attempt timeline, and notes.
- Countdown: a lightweight 60s ticker rendering time remaining to `follow_up_at`, red once overdue.
- `src/components/recapture/RecaptureReports.tsx`: update status labels/aggregations to the new bucket values and report completion reasons.
- Portal history: new read-only section in the appointment detail view, joining `recapture_cases` → `recapture_attempts` by appointment/patient, rendered only for non-`project_user` roles.

## Assumptions

- Existing case data maps to the new buckets as described above; nothing is deleted.
- Claim/Assign remains available inside the drawer (not as a row action).
- Reports keep working off the same tables; no separate reporting migration.
