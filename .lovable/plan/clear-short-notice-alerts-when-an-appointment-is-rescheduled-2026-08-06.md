# Clear Short-Notice alerts when an appointment is rescheduled

## Problem

When an appointment is flagged **Short-Notice** and is later rescheduled far enough out to fix the notice window, the alert stays attached. QA Operations keeps showing the Short-Notice badge, and the Review Queue keeps showing the short-notice indicator, so QAs think it is still a short-notice booking.

Confirmed in the code: the reschedule trigger only syncs the new appointment date onto the QA case (`qa_sync_appt_date_from_appointment`). Nothing re-evaluates whether the short-notice condition is still true, and the short-notice alert row itself has no way to be marked resolved.

## What will change

1. **Automatic re-evaluation on reschedule.** Whenever an appointment's date or time changes, the system recalculates the notice window (new appointment time vs. now) against that clinic's short-notice threshold.
   - If the new appointment is now **outside** the threshold: the short-notice alert is marked resolved and the open Short-Notice QA case is closed automatically with the resolution "Auto-resolved — rescheduled outside short-notice window", plus a timeline entry on the case so the history is preserved.
   - If the new appointment is **still inside** the threshold: the alert stays open and its hours figure is updated to the new value, with a timeline note that the appointment moved but is still short notice.

2. **QA Operations Queue.** Once the Short-Notice case is closed, the Short-Notice badge no longer shows for that patient. Any other alerts on the same patient (OON, Confirmed Audit, Review Queue) are untouched and remain open. Nothing is deleted — the closed case is still visible under Completed/All and in the case history.

3. **Review Queue.** The Short-Notice badge is driven from the same alert record, so it disappears once the alert is resolved.

4. **One-time cleanup.** Existing appointments that were already rescheduled out of the short-notice window get their stale Short-Notice alerts and QA cases resolved the same way, so the queue is accurate immediately.

## Technical details

- `short_notice_alerts`: add `resolved_at timestamptz`, `resolved_reason text`, `resolved_hours_difference numeric`.
- New `public.qa_resolve_short_notice_on_reschedule()` (SECURITY DEFINER, `search_path = public`), fired `AFTER UPDATE OF date_of_appointment, requested_time` on `all_appointments`:
  - build the new appointment timestamp with the existing `qa_build_appt_ts(project_name, date, requested_time)` helper;
  - read `projects.short_notice_threshold_hours` (default 72);
  - hours = new appointment ts − `now()`;
  - hours ≥ threshold → `UPDATE short_notice_alerts SET resolved_at = now(), resolved_reason = 'rescheduled_outside_window'` for unresolved rows of that appointment, and complete the open `qa_cases` row where `alert_type = 'short_notice'` (`workflow_status = 'completed'`, `completed_at`, `date_resolved`, `resolution_type = 'Auto-resolved — rescheduled outside short-notice window'`) plus a `qa_case_activity` `status_change` entry;
  - hours < threshold → update `hours_difference` / `appointment_datetime` on the open alert and add an activity entry only;
  - wrapped in an exception handler that logs to `security_audit_log` and returns NEW, matching the other QA ingest triggers, so a reschedule can never fail because of this.
- `ReviewQueue.tsx`: the `short_notice_alerts` fetch adds `.is('resolved_at', null)`.
- `QAOperationsQueue.tsx` needs no change — its badge logic already requires `workflow_status !== 'completed'` for the short-notice sibling.
- Backfill statement applying the same rule to currently unresolved alerts whose linked appointment is now outside the window.
