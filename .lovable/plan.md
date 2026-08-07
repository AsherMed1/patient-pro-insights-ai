# Keep rescheduled short-notice records open for QA audit

## Feedback

Today, when a short-notice appointment is rescheduled outside the clinic's window, the QA record auto-completes itself. QA would rather the record stay open and auditable — only the "Short Notice" designation should go away.

## What will change

1. **No more auto-complete.** A reschedule out of the short-notice window no longer sets the QA case to Completed, and no longer stamps a resolution or resolved date. The case stays in whatever workflow status it was in (New / In Review), so a QA still has to work and complete it.

2. **The Short-Notice badge still clears.** The alert record is still marked resolved, and the case is flagged as "short notice corrected". In QA Operations the badge changes from the red-flag Short-Notice tag to a neutral "Short-Notice (corrected)" label, so it is obvious the timing issue was fixed but the record still needs an audit.

3. **History preserved.** The case timeline keeps the entry explaining the reschedule: new appointment time, hours of notice, and the clinic threshold. Behaviour when the new time is *still* inside the window is unchanged (alert stays, hours refreshed, note added).

4. **Review Queue.** Unchanged from the current behaviour — the badge disappears once the alert is resolved.

5. **One-time correction.** Cases that the previous version already auto-completed (resolution "Resolved by QA" written by the auto-resolver, with no human QA name attached) are reopened to their prior status and flagged as corrected, so QA can audit them. Cases a human genuinely completed are left alone.

## Technical details

- `qa_cases`: add `short_notice_cleared_at timestamptz`.
- Rewrite `public.qa_resolve_short_notice_on_reschedule()` (SECURITY DEFINER, `search_path = public`), same trigger binding:
  - outside-window branch: still resolve `short_notice_alerts` (`resolved_at`, `resolved_reason = 'rescheduled_outside_window'`, `resolved_hours_difference`, `appointment_datetime`); on the open case set `short_notice_cleared_at = now()`, `last_alert_activity_at`, `updated_at` only — remove the `workflow_status = 'completed'` / `completed_at` / `resolution_type` / `date_resolved` writes;
  - keep the `qa_case_activity` `status_change` entry, reworded to "Short-Notice condition cleared — appointment rescheduled to X (N hours notice, threshold H). Record remains open for audit.";
  - inside-window branch unchanged;
  - keep the existing exception handler writing to `security_audit_log`.
- `QAOperationsQueue.tsx`: badge logic at lines ~300-305, ~1903 and ~2261 currently keys off `alert_type === 'short_notice' && workflow_status !== 'completed'`; add `&& !short_notice_cleared_at`, and render a muted "Short-Notice (corrected)" chip when `short_notice_cleared_at` is set. Include the new column in the case select and the row type.
- Backfill: for `qa_cases` where `alert_type = 'short_notice'`, `workflow_status = 'completed'`, `qa_name IS NULL`, and a `qa_case_activity` row exists with metadata reason `rescheduled_outside_window`, reset `workflow_status` to `'in_review'` (or `'new'` when never assigned), clear `completed_at` / `date_resolved` / `resolution_type`, and set `short_notice_cleared_at`.
