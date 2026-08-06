# QA Operations Queue: Multi-Select Clinic Filter

## What we're building

Replace the single-select **Project** filter in the QA Operations Queue with a multi-select dropdown so users can view cases for several clinics at once.

## Changes

1. **Component swap**
   - In `src/components/admin/QAOperationsQueue.tsx`, replace the `Select` used for `projectFilter` with a `DropdownMenu` containing `DropdownMenuCheckboxItem` entries, matching the existing Columns visibility pattern.

2. **State update**
   - Change `projectFilter` from `string` (`'all'` or a single project) to `string[]`.
   - Default value: `[]` meaning "All projects".
   - Add helpers to toggle a project and clear all selections.

3. **Filtering logic**
   - Update `rowFilteredNoAlert` so a case passes when `projectFilter.length === 0` (all) or `projectFilter.includes(c.project_name)`.
   - Update `hasActiveFilter` to treat a non-empty `projectFilter` array as active.

4. **Trigger display**
   - Show "All projects" when nothing is selected.
   - Show the clinic name when one is selected.
   - Show "N clinics selected" when multiple are selected.

5. **Preservation**
   - Keep existing sort, search, alert type, assignment, and date filters untouched.
   - No database, edge function, or realtime changes.

## Files touched

- `src/components/admin/QAOperationsQueue.tsx`
