# Recapture redesign — drawer workflow for Setters

Rework Recapture so it works like QA Operations: one **Open Record** action per row, a right-side patient drawer, and contact attempts fully separated from the record's outcome.

## Buckets

The queue tabs become:

- **New** — entered Recapture, no attempts logged yet
- **Nurture** — attempts logged, no successful contact, no scheduled follow-up
- **Follow-Up** — a specific future follow-up date/time is set (shows countdown; overdue is highlighted)
- **Completed** — closed with a completion reason
- **All**

Existing records map over: `pending` → New, `engaging` → Nurture, `follow_up_required` → Follow-Up, `completed` stays.

## Row actions

Each row collapses to a single **Open Record** button (plus the existing quick links). Everything else moves into the drawer.

## Patient drawer

Right-side drawer, queue stays behind it so the Setter never loses their place. Shows:

- Patient name, clinic, phone, email, service line
- Last appointment date/time, lost type (Cancelled / No-Show)
- Current recapture status and bucket, follow-up date/time + countdown when set
- Number of contact attempts
- Portal link (opens the full appointment record) and GoHighLevel link
- Chronological contact attempt history (date/time, setter, method, outcome, note)
- Internal notes

Not included: tech tickets, Control Hub actions, or any other QA-only functionality.

## Two separate actions in the drawer

**1. Log Attempt** — records date/time, setter, method (Call / Text / Email / Voicemail), outcome, optional note. It only ever appends to history. It never completes a record, and the drawer stays open with the new attempt appearing immediately in the timeline. A record in New moves to Nurture on its first logged attempt; a record in Nurture or Follow-Up stays where it is.

**2. Outcome** — a separate dropdown next to Log Attempt:

- **Nurture** — keeps the record active in the Nurture bucket, attempts preserved, more attempts can be logged.
- **Follow-Up Required** — requires a follow-up date and time, optional note. Record moves to the Follow-Up bucket showing the scheduled time and a live countdown; overdue follow-ups are visually flagged. Record stays active.
- **Completed** — requires a completion reason: Booked / Rescheduled, Not Interested, Unable to Reach, Invalid Contact Number, Other. **Other requires a note.** Only this closes the record and removes it from the active worklist.

## Booked / Rescheduled

Completing with Booked / Rescheduled marks the case recovered and closes it, but the attempt history stays attached to the patient.

## Recapture history on the Patient Portal record

The patient's appointment record gains an internal **Recapture contact history** section listing attempt date/time, outcome, setter, and notes. It is visible to PPM staff only (admin / agent / va / setter roles) and hidden from clinic users, matching how internal notes are already gated.

## Technical notes

- Migration on `public.recapture_cases`:
  - allow `work_status` values `new`, `nurture`, `follow_up`, `completed` (keep old values readable, backfill `pending`→`new`, `engaging`→`nurture`, `follow_up_required`→`follow_up`)
  - add `follow_up_at timestamptz`, `follow_up_note text`, `completion_reason text`
  - no new tables; `recapture_attempts` already carries channel / result / note / user / timestamp
- `src/components/recapture/RecaptureQueue.tsx`: strip the per-row dropdown down to Open Record; retab the buckets; move detail rendering into a new `src/components/recapture/RecaptureCaseDrawer.tsx` (Sheet) holding header facts, links, attempt timeline, notes, Log Attempt dialog, and Outcome dialog.
- New `src/components/recapture/OutcomeDialog.tsx` handling the three branches with their validation (follow-up date+time required; completion reason required; note required for Other).
- Countdown for the Follow-Up bucket rendered from `follow_up_at` in both the row and the drawer, with a shared helper.
- `src/components/recapture/RecaptureReports.tsx`: label updates for the new buckets and completion reasons.
- Portal record: new internal-only Recapture history block in `DetailedAppointmentView.tsx`, sourced from `recapture_attempts` joined via `recapture_cases.appointment_id`, gated by the same PPM-role check used for internal notes.

## Validation

Work a test case end to end: log an attempt (record stays open, moves to Nurture), set Follow-Up Required (countdown shows), then Complete → Booked / Rescheduled (closes, history remains and appears on the Portal record for PPM but not for a clinic user).
