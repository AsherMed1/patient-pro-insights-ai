## Goal
Add a "240 hours (10 days)" option to the Short-Notice Alert Threshold dropdown in the Edit Project dialog.

## Change
- `src/components/projects/EditProjectDialog.tsx`: add `<SelectItem value="240">240 hours (10 days)</SelectItem>` after the existing 168-hour option.

## Notes
The threshold is already stored as an integer number of hours in `projects.short_notice_threshold_hours` and parsed generically in `ProjectsManager.handleEditProject`, so no database or backend change is needed — the alert logic will honor 240 automatically.
