# Duplicate-Aware Review Queue

When a Review Queue item belongs to a patient who already has another active appointment in the same project on a future date, surface that fact in the row and give the reviewer two new one-click resolutions in addition to the existing Approve / OON / Decline buttons.

## What changes (UI-only)

### 1. Duplicate warning badge on each pending row
- In `src/components/admin/ReviewQueue.tsx`, after `fetch()` returns pending rows, run a single follow-up query against `all_appointments` to find any non-superseded, non-pending appointment that:
  - shares `project_name` with the queue row,
  - matches on `lead_phone_number` OR `lead_email` OR `ghl_id` (any),
  - has `date_of_appointment >= today`,
  - has `status` NOT in the terminal set (`Cancelled`, `No Show`, `OON`, `Do Not Call`, `Rescheduled`, `Showed`, `Won`) — i.e. Confirmed / Pending only,
  - is not the queue row itself.
- Build a `duplicatesByRowId: Record<string, ExistingAppt[]>` map and store in state.
- For each row with ≥1 match, render an amber badge `Duplicate of existing` next to the patient name, and inside the expanded panel show a compact list of the matched appointment(s): date, time, calendar, status, with a "View" link that opens the existing appointment in `DetailedAppointmentView` (same `openDetail` flow, different id).

### 2. Two new resolution actions (pending view only)
Add buttons in the row action cluster, shown only when `duplicatesByRowId[row.id]?.length > 0`:

- **Replace existing** (primary)
  - Confirmation modal lists the existing appt(s) that will be cancelled.
  - On confirm:
    1. Approve the new queue row (reuses `performAction(id, 'approved')` — keeps existing GHL "approved" tag logic).
    2. For each existing match, set `status='Cancelled'`, `internal_process_complete=true`, write an `appointment_notes` row attributed to the reviewer: `"Superseded by newer appointment {new date/time} via Review Queue — by {userName}"`.
  - No direct GHL cancel call is added here (status change will flow through the same path the manual status dropdown already uses; out of scope to change that pipeline).

- **Keep existing, dismiss new** (outline / muted)
  - Confirmation modal explains: the new queue row will be dismissed (review_status='dismissed', same as the existing Dismiss action in the Declined tab) and no downstream cancellation will be triggered.
  - On confirm: update the new row to `review_status='dismissed'`, `reviewed_at`, `reviewed_by`, `review_notes='Duplicate of existing appointment kept'`; insert an `appointment_review_history` row with `action='dismissed'`; log `audit_logs` via `log_audit_event`.
  - The existing confirmed appointment is left untouched.

Both actions respect the existing `processing` flag and call `fetch() + fetchCounts()` on success.

### 3. Wording
- Badge text: `Duplicate — existing {Confirmed|Pending} appt on {date} {time}`.
- Modal copy uses "this clinic / patient", no "GHL" / "GoHighLevel" mentions per project rule.

## Out of scope
- No edge function / webhook changes.
- No automatic GHL cancel API calls beyond what the existing status-change path already does.
- No change to how duplicates are detected on inbound webhook (that's a separate workflow).
- No change to the Declined tab actions.

## Files touched
- `src/components/admin/ReviewQueue.tsx` — duplicate fetch, state, badge, expanded-panel list, two new action buttons + their confirmation dialogs and handlers.

No schema changes, no new dependencies.
