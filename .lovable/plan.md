## Route re-alerts on completed QA cases back to New

Today `qa_upsert_case` handles a repeat alert on a completed case by flipping it to `workflow_status = 'reopened'`. The user wants those cases to re-appear at the top of **New** instead, keep their full audit trail, and expose the new alert's type + timestamp. The `reopened` bucket becomes obsolete.

### DB changes (single migration)

Rewrite `public.qa_upsert_case` so the "completed match" branch:

- Sets `workflow_status = 'new'` (not `'reopened'`).
- Resets `entered_queue_at = now()` so the row sorts to the top of the New queue.
- Refreshes `last_alert_activity_at = now()`, updates `appointment_status`, `appointment_date`, `patient_name`, `service_line` from the new alert.
- Clears prior-cycle fields that would otherwise mislead: `review_started_at = NULL`, `completed_at = NULL`, `completed_by_user_id = NULL`, `date_resolved = NULL`, `resolution_type = NULL`. Keeps `qa_name`, `qa_case_notes`, `qa_case_activity` untouched — history is preserved via the child tables and untouched narrative fields.
- Inserts a `qa_case_activity` row with `activity_type = 'realerted'`, description "New {alert_type} alert — case returned to New queue", and `metadata` containing `alert_type`, `alert_source_id`, and `previous_completed_at` for auditability.
- If the incoming alert's `alert_type` differs from the stored `alert_type`, also update the row's `alert_type` to the new one (so the badge reflects the current trigger). The old alert type is retained in the activity log entry above.

Backfill: none required — this only affects future re-alerts. Existing rows currently in `reopened` are migrated to `new` in the same migration (`UPDATE qa_cases SET workflow_status='new', entered_queue_at=COALESCE(last_alert_activity_at, entered_queue_at) WHERE workflow_status='reopened'`) and an activity row is written for each.

The `reopened` enum value stays on the CHECK constraint for backward compat with any historical activity references, but nothing writes it going forward.

### UI changes (`src/components/admin/QAOperationsQueue.tsx`)

- Remove the **Reopened** tab and its count query; drop it from the tab list.
- No status-dropdown change needed — `reopened` remains selectable manually if an admin ever needs it, but by default the workflow is `new → in_review → pending_escalated → completed`, and a re-alert loops back to `new`.
- Activity feed already renders any `qa_case_activity` row, so the new `realerted` entry will appear automatically with its timestamp; add a friendly label mapping (`realerted → "Re-alerted"`) where activity types are formatted.
- Case detail header: surface `last_alert_activity_at` next to `entered_queue_at` when they differ (labeled "Latest alert") so QA can see when the current trigger fired vs when the case first opened.

### Verification

- Complete a QA case, then trigger a new OON/confirmed alert on the same appointment → row returns to top of New, alert type + latest alert timestamp reflect the new trigger, prior notes/activity still visible.
- A brand-new alert with a different `alert_type` on a completed case still creates a fresh row (existing dedup index behavior — unaffected).
- Existing `reopened` cases now show under New after migration.