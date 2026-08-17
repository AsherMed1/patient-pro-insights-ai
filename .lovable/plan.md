# Add 18-hour option to Short-Notice Alert Threshold

## Goal
Add an 18-hour option to the Short-Notice Alert Threshold dropdown in the Edit Project dialog so clinics can choose a tighter window between the existing 12-hour and 24-hour options.

## What will change

- Insert an `18 hours` option in the `short_notice_threshold_hours` dropdown in `src/components/projects/EditProjectDialog.tsx`.
- The new option appears between 12 hours and 24 hours, maintaining the ascending order.

## Technical details

- File: `src/components/projects/EditProjectDialog.tsx`.
- Change: add `<SelectItem value="18">18 hours</SelectItem>` between the existing 12 and 24 hour items.
- The value is stored as a string in the Select component (as with the existing values) and converted to an integer when saved via `ProjectsManager.tsx`.
- No database, schema, or backend changes are required; the existing `short_notice_threshold_hours` numeric column already supports any value.
- The `AddProjectDialog.tsx` does not include a threshold field, so no change is needed there.

## Acceptance
- The Edit Project dialog shows a new "18 hours" choice.
- Selecting it saves 18 to the project and the Short-Notice logic applies that threshold.
