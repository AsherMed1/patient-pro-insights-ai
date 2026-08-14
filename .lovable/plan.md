# QA Operations: filter by patient record created date

Today the date range in QA Operations (and in QA Reports) filters on `qa_cases.entered_queue_at` — the moment each individual alert entered the queue. A patient booked Aug 9 whose OON alert fired Aug 10 therefore shows up in an Aug 3–9 view with only the earlier Confirmed-audit alert, so the row reads "Confirmed" and looks outstanding.

## What changes

- The date range selects **patient records whose appointment was created inside the range**, not alerts.
- Once a patient qualifies, **all of their alerts are pulled in**, including ones raised after the range ends. The row's status, alert badges, latest-activity time and the drawer's notes/activity/history therefore reflect the record's full life, not a slice of it.
- The list always shows the **current/latest** workflow status, appointment status, escalation state and ticket state.
- Same rule applies to QA Reports (Case Metrics) so historical reporting matches: a record created Aug 9 counts in Aug 3–9 and is reported with its final outcome (Completed / OON / Declined).

Example: record created Aug 9, OON update Aug 10 → an Aug 3–9 filter shows the patient with OON status and the complete activity timeline.

## Notes

- Turnaround metrics keep measuring from first queue entry to resolution; only the bucketing basis changes to record created date.
- QA Specialist Activity report is unchanged — it is deliberately an action log filtered by when actions happened.
- Records with no linked appointment (contact-only alerts) fall back to the alert's first-entered date so nothing disappears from the queue.

## Technical

1. Migration: add `qa_cases.appointment_created_at timestamptz`, indexed. Populate it in `qa_upsert_case` (and the review-queue / short-notice / status ingestion triggers that call it) from `all_appointments.date_appointment_created`, with `coalesce(..., first_entered_at, entered_queue_at)` as fallback. Backfill existing rows by joining on `appointment_id`.
2. `QAOperationsQueue.tsx`: switch the `dateFrom` / `dateTo` predicate from `entered_queue_at` to `appointment_created_at`. Apply the filter at the **group** level: build patient groups first (existing `groups` logic), keep a group when *any* of its cases qualifies, then render the group with all its children — so post-range alerts stay attached. The unbounded-fetch path already widens the query when a date filter is set; extend it to also fetch sibling cases for qualifying patients.
3. `QAReports.tsx`: query `.gte/.lte` on `appointment_created_at` instead of `entered_queue_at`, and label the pickers "Record created". Aggregations keep using `date_resolved`/`completed_at` for turnaround.
4. Column label in the queue: "Created" continues to mean record created date, now consistently sourced from `appointment_created_at`.
