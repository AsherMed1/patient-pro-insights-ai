## Multi-Assignee Support for ControlHub Tickets

Allow selecting multiple assignees when creating a VA or Tech ticket from the QA Operations Queue.

### Changes

**1. `src/components/admin/QAOperationsQueue.tsx` — Ticket dialog**
- Replace single-select Assignee dropdown with a multi-select searchable picker (checkbox list inside a Popover, with selected names shown as removable chips/badges).
- State becomes `assigneeNames: string[]` instead of a single string.
- Same 12-name list for VA; existing tech list for Tech.
- Activity log entry lists all selected names (comma-separated) instead of one.

**2. `supabase/functions/create-controlhub-ticket/index.ts`**
- Accept `assignee_names: string[]` (keep `assignee_name` as a backward-compatible fallback for a single value).
- Forward to ControlHub as both:
  - `assignee_names` (array) — primary
  - `assignee_name` (string) — first name, for backward compatibility
  - `metadata.assignees` (array) — for the receiving function to fan out
- No DB schema change needed; ControlHub-side routing decides how to store multi-assignment.

**3. Note about ControlHub side**
- The existing `receive-external-ticket` function on the PPM ControlHub project currently reads a single `assignee_name`. To fully honor multiple assignees, that function will need a follow-up update (I will provide the exact prompt once this side is merged). Until then, ControlHub will use the first assignee and the full list will be visible in the ticket description/metadata.

### UX details
- Empty selection is allowed (ticket created unassigned, matching current behavior).
- Selected assignees rendered as small removable badges above the search input.
- Search filters the checklist by name.
- No changes to any other QA fields, filters, or workflows.
