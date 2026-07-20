## What "Create ControlHub Ticket" does today

Clicking the button immediately calls the `create-controlhub-ticket` edge function with **no user input**. That function pulls fields off the QA case and posts a hardcoded payload to ControlHub's `receive-external-ticket`:

- `task_name` — auto-built as `QA: <alert_type> — <patient_name>`
- `client_name` — QA case's project
- `service_involved` — QA case's service line
- `issue_type` — always `qa-operations`
- `priority` — always `medium`
- `description` — auto-composed multi-line summary (alert, patient, project, service, status, appointment id)
- `submitted_by` — always `PatientPro QA Queue`

So today it's a fire-and-forget action — nothing to review, nothing to edit, and the user never gets to write the ticket the way they would in ControlHub.

## What you want instead

A ticket-creation form that opens on the same page (inside the QA case drawer). Same fields you'd fill in ControlHub, prefilled from the case, editable, then Submit posts to ControlHub and links the ticket to the QA case.

## Plan

### 1. New "Create ControlHub Ticket" dialog (frontend only)

In `src/components/admin/QAOperationsQueue.tsx`, replace the current one-click button with a button that opens a `Dialog` containing a form. Fields, all editable, prefilled from the QA case:

- **Task name** (text, required) — default `QA: <alert_type> — <patient_name>`
- **Client** (text, required) — default `project_name` (locked or free-text; see Q1)
- **Service involved** (text) — default `service_line`
- **Issue type** (select) — options mirror ControlHub's categories; default `qa-operations` (see Q2 for the list)
- **Priority** (select: low / medium / high / urgent) — default `medium`
- **Description** (textarea, required) — default = today's auto-composed summary, fully editable
- **Submitted by** (text, read-only) — auto-filled with the current user's full name (falls back to email)

Buttons: **Cancel** / **Create ticket** (with loading state). On success, close the dialog, refresh the case, show the ticket ID + external-link icon in the drawer (already implemented).

Nothing else in the drawer changes.

### 2. Edge function update

`supabase/functions/create-controlhub-ticket/index.ts` starts accepting the form values instead of rebuilding them server-side:

- Accept `{ case_id, task_name, client_name, service_involved, issue_type, priority, description, submitted_by }`
- Validate required fields (`case_id`, `task_name`, `client_name`, `description`); reject with 400 otherwise
- Forward those exact values to ControlHub's `receive-external-ticket`
- Keep the existing metadata block (`qa_case_id`, `project`, `alert_type`, `appointment_id`, `ghl_contact_id`) so ControlHub can still cross-link
- Keep the existing "save ticket id/url on the case + write a `qa_case_activity` row" behavior
- Keep the stub fallback when ControlHub secrets aren't set

No database changes. No new tables or columns.

### Technical notes

- `qa_cases` already has `controlhub_ticket_id`, `controlhub_ticket_url`, `controlhub_ticket_status` — reused as-is.
- The dialog is local component state; no new context or store.
- Once the case has a ticket, the existing "Ticket <id> ↗" link stays (no re-open of the form).

## Open questions

**Q1.** Should **Client** be locked to the QA case's project (safer, matches audit trail) or a free-text field the QA can override before submitting?

**Q2.** For **Issue type**, do you want a fixed dropdown? If yes, please share the list ControlHub uses (I only see `qa-operations` in current code). If you'd rather keep it as free text for now, I'll do that.
