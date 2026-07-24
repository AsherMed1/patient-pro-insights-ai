## Add Clear Audit Results button

Add a secondary button next to "Save audit details" in the QA Operations case drawer that lets the user wipe an incorrectly-tagged audit back to a blank state.

### Behavior
- Button label: **Clear Audit Results**, `variant="outline"` (destructive text), placed left of the Save button.
- On click, show an AlertDialog confirmation ("This will reset the audit fields for this case. Continue?").
- On confirm, update `qa_cases` row setting these fields to `null`:
  - `qa_name`
  - `self_booked`
  - `error_category`
  - `error_source`
  - `caught_before_clinic`
  - `resolution_type`
  - `date_resolved` (so the case no longer counts as audited)
  - `ticket_created` stays untouched (real tickets aren't undone by a clear).
- Reset the local `audit` state to blanks (qa_name defaults back to the current user's name for convenience) so the form reflects the cleared values immediately.
- Insert a `qa_case_activity` row: `activity_type='audit_cleared'`, `description='Audit results cleared by {name}'`, `actor_user_id=user.id`.
- Toast "Audit results cleared", then call `onRefresh()` so the table (which shows error_category / resolution_type / date_resolved columns) reflects the reset.
- Disable the button while the request is in flight (`clearingAudit` state) and while `savingAudit` is true.

### Access
- Same permissions as saving audit (admin / agent / qa_specialist / va already reach this drawer). No new RLS needed — existing update policy on `qa_cases` covers it.

### Files touched
- `src/components/admin/QAOperationsQueue.tsx` only — add `clearAudit` handler, `clearingAudit` state, AlertDialog, and the button in the audit form footer (~line 1220).

No database migration required.
