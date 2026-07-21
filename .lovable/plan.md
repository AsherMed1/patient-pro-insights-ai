
## Goal
Let QA specialists pick an assignee when creating a ControlHub ticket from the QA Operations Queue, so tickets don't need to be re-assigned in ControlHub afterwards.

## UI (`src/components/admin/QAOperationsQueue.tsx`)
Add an **Assignee** field to the Create ControlHub Ticket dialog, placed between Ticket Type and Task Name:

- Rendered as a searchable Select (same `Command`/`Popover` pattern used elsewhere in this file for Error Source/Category).
- Optional — a "Unassigned" first option that submits nothing.
- Options depend on Ticket Type:
  - **VA**: Ivy Simeon, Jenny, Giselle Mitra, Gloria Govender, Matthew Pernes, Robert Christian Tan, Dean Lunderstedt, Isis Curiel, Aridni Martinez, Marissa Kresnik, Kathryn Meksavanh, Alexa Briggs.
  - **Tech**: same list (per user answer).
- Switching Ticket Type resets the selected assignee (names could differ later; keeps state clean).
- Lists defined as two constants at the top of the file (`VA_ASSIGNEES`, `TECH_ASSIGNEES`) so future edits are one-liners.

## Edge function (`supabase/functions/create-controlhub-ticket/index.ts`)
- Accept a new optional string field `assignee_name` in the request body.
- Trim + length-cap it; if present, forward it to ControlHub's `receive-external-ticket` POST body as `assignee_name` (top-level) and also mirror into `metadata.assignee_name` so it's visible even if ControlHub hasn't wired the top-level field yet.
- Include `assignee_name` in the `qa_case_activity` `ticket_created` metadata so the QA case audit trail records who it was routed to.
- No validation against a fixed list on the server — names-only routing per user preference; ControlHub resolves the name to a user.

## Out of scope
- No changes to ControlHub itself. A short follow-up note in the response will mention that ControlHub's `receive-external-ticket` needs to read `assignee_name` (or `metadata.assignee_name`) and set the ticket's assignee accordingly for auto-routing to take effect end-to-end.
- No DB schema changes.
