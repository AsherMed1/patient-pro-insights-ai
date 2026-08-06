# Verify Short-Notice auto-clear (throwaway data only)

## Already verified (read-only, no data touched)

- Trigger `trg_qa_resolve_short_notice_on_reschedule` exists and is enabled on `all_appointments`, firing on changes to appointment date or time.
- The one-time backfill closed 16 stale alerts, and the linked QA cases show `completed` with resolution "Resolved by QA".
- A fresh re-check finds zero unresolved short-notice alerts whose appointment now sits outside its clinic's threshold — the queue is currently accurate.

## What still needs a live test

Whether the trigger fires correctly in real time on a reschedule. This requires writing data, so it will be done on a throwaway record only — no real patient or clinic record is touched.

## Test steps

1. Create a throwaway appointment ("ZZ Short Notice Test") on a test project, dated inside the short-notice window.
2. Create a matching `short_notice_alerts` row and let the QA case ingest, confirming the Short-Notice badge appears in QA Operations.
3. Reschedule the throwaway appointment to a date well outside the window and confirm:
   - the alert row gets `resolved_at` and reason `rescheduled_outside_window`;
   - the Short-Notice QA case flips to completed with the auto-resolution text and a history entry;
   - the badge disappears from QA Operations and Review Queue.
4. Second pass: reschedule another throwaway record to a date still inside the window and confirm the alert stays open with refreshed hours plus a history note.
5. Delete every throwaway row (appointment, alert, QA case, activity entries) and report results.

## Ticket reply (to paste once the test passes)

"This is fixed. When a short-notice appointment is rescheduled far enough out, the Short-Notice alert now clears automatically and the QA record closes with a note explaining why. If the new time is still short notice, the alert stays but updates to the new hours. We also cleaned up the existing records that were already rescheduled, so the queue is accurate now."
