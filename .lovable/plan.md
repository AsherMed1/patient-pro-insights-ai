## Goal
Update the default task name in the QA Operations Queue "Create ControlHub Ticket" dialog so that:
- The task name stays editable.
- VA Tickets default to **VA Ticket — Patient Name**.
- Tech Tickets default to **Tech Ticket — Patient Name**.
- The old `QA: confirmed_audit — Patient Name` format is removed.

## Files to change
- `src/components/admin/QAOperationsQueue.tsx`

## Implementation
1. Update the ticket title helper functions inside `CaseDrawer`:
   - `stripTypePrefix(name)` should strip the new prefixes (`VA Ticket — `, `Tech Ticket — `) as well as the old prefixes (`VA — `, `Tech — `, and `QA: <alert_type> — `) so switching ticket types does not stack prefixes.
   - `applyTypePrefix(name, type)` should apply `VA Ticket — ` for `va` and `Tech Ticket — ` for `tech`.

2. Update `openTicketDialog` so the initial `task_name` is just the patient name (e.g., `caseData.patient_name || 'Unknown'`). The ticket-type selector will then apply the correct prefix when the QA chooses VA or Tech.

3. Keep the existing `Input` for task name fully editable, and keep the existing behavior where changing the Ticket type dropdown re-applies the prefix to the current base name.

## Verification
- Open a QA case and click "Create ControlHub Ticket".
- Confirm the Task name field starts with only the patient name.
- Select "VA Ticket" → field becomes `VA Ticket — Patient Name`.
- Select "Tech Ticket" → field becomes `Tech Ticket — Patient Name`.
- Edit the patient portion → switching ticket type preserves the custom text and only swaps the prefix.
- Submit a ticket and confirm the created ticket carries the simplified title in ControlHub.