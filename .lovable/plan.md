## Add Ticket Type (VA / Tech) to the ControlHub Ticket dialog

Replace the current free-text "Issue type" field with a required **Ticket Type** dropdown with two options — **VA Ticket** and **Tech Ticket** — no default selection. The chosen value is sent to ControlHub as `issue_type` (`va` or `tech`) so routing on the ControlHub side can direct it to the correct queue.

### Changes

**`src/components/admin/QAOperationsQueue.tsx` — Create Ticket dialog**
- Remove the free-text "Issue type" input.
- Add a required `Select` labeled **Ticket Type** with options:
  - `VA Ticket` → value `va`
  - `Tech Ticket` → value `tech`
- Initial value empty; placeholder "Select ticket type…".
- Disable the **Create ticket** submit button until a ticket type is picked (alongside the existing required fields).
- Prefix the auto-generated **Task name** with the chosen type once selected, e.g. `VA — QA: oon — Georgia Test` / `Tech — QA: oon — Georgia Test`, so it's obvious in ControlHub. Users can still edit it.
- Include the ticket type in the ticket-created activity log entry shown on the case.

**`supabase/functions/create-controlhub-ticket/index.ts`**
- Validate `issue_type` is one of `va` | `tech` (400 otherwise). Drop the current fallback that defaults to `qa-operations`.
- Forward `issue_type` unchanged in the ControlHub payload and in the `qa_case_activity` metadata.

### Out of scope
- No separate ControlHub destination per type — a single endpoint receives both; ControlHub decides routing from `issue_type`.
- No changes to existing tickets already created.
