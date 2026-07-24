## Root cause (verified)

Patricia Harris's Slack alert fired at 3:23 PM but never landed in QA Operations because inserting into `short_notice_alerts` throws:

> `column a.procedure_type does not exist`

The trigger `qa_ingest_short_notice()` (on `short_notice_alerts`) selects `a.procedure_type` from `all_appointments`, but that column doesn't exist on that table (only `calendar_name` does). Because the trigger errors, the insert is rolled back — so:

- No `short_notice_alerts` row (last successful insert was July 15).
- No paired `short_notice` + `review_queue` `qa_cases` rows.
- Nothing appears in QA Operations even though Slack was sent.

Confirmed via edge logs (`notify-slack-short-notice`) and `information_schema.columns`.

## Fix

Migration to replace `public.qa_ingest_short_notice()` so it no longer references the missing `procedure_type` column — use `calendar_name` directly (which is what `COALESCE(procedure_type, calendar_name)` was already falling back to). Behavior is otherwise unchanged: same paired `short_notice` + `review_queue` case creation when `review_status='pending'`.

## Backfill

After the trigger is fixed, insert the missing `short_notice_alerts` row for Patricia Harris (appointment `051f06e0-0620-4118-90e9-7d5b7a1f95c6`) using the values from the edge-function log, so the QA Operations pair (Short Notice + Review Queue) appears without waiting for a new alert.

Also sanity-check for any other short-notice Slack alerts sent since July 15 with no matching DB row and backfill them the same way.

## Out of scope

- No changes to the Slack edge function, QA UI, or Review Queue logic.
