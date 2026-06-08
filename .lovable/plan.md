# Enable editing Name and DOB in Review Queue

## Problem
In `src/components/admin/ReviewQueue.tsx`, the patient name (line ~649) and DOB (line ~731) render as plain text. There is no UI to update them, so admins can't correct typos or missing DOBs before approving.

## Plan

### 1. Add inline edit UI in the expanded row panel
In the expanded details block (lines ~722–758), replace the static Name/DOB displays with editable fields gated by an "Edit" toggle:
- **Name**: `Input` (text)
- **DOB**: `Input type="date"` (ISO `YYYY-MM-DD`)
- Show **Save** / **Cancel** buttons when in edit mode.
- Keep the row header (line 649) showing the current `lead_name` for quick scanning.

### 2. Save handler
Add `handleSaveDetails(rowId, { lead_name, dob })` that:
- Trims inputs; requires non-empty name; validates DOB format if provided.
- Updates `all_appointments`:
  - `lead_name` → top-level column
  - `dob` → top-level column (per memory: `all_appointments.dob` is primary source of truth)
  - `parsed_contact_info.name` and `parsed_demographics.dob` inside the JSONB blobs (per Core memory: "UI edits must simultaneously update top-level columns AND JSONB `parsed_*` objects"). Merge into existing JSONB to avoid clobbering other fields.
  - Recalculate `parsed_demographics.age` from the new DOB (per Core memory: "Always recalculate Age when DOB changes").
- Logs an `audit_logs` entry via `log_audit_event` describing what changed (`"Updated patient name/DOB: <old> → <new> by <userName>"`), matching the attribution pattern already used for Approve/Decline.
- Refreshes the row in local state and shows a toast.

### 3. State
Add `editingRowId`, `editName`, `editDob` to component state. Reset on cancel/save.

### 4. Out of scope
- No outbound GHL contact sync for name/DOB changes in this pass (can be added later via `update-ghl-contact`).
- No changes to the Declined view edit behavior — edit is only available in the Pending view.

## Technical notes
- Merge JSONB safely: `parsed_contact_info: { ...(row.parsed_contact_info || {}), name }` and same for demographics.
- Age calc: `floor((today - dob) / 365.25)`; store as integer.
- Use existing `supabase`, `toast`, `userName`, `user` already imported in the file.
