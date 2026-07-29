## Goal
Add a 14 calendar-day option to the **Short-Notice Alert Threshold** dropdown in the project edit dialog.

## Current State
`src/components/projects/EditProjectDialog.tsx` already exposes a dropdown with threshold options up to `240` hours (10 days). The value is stored as a plain integer hour count in `projects.short_notice_threshold_hours`.

## Change
- Add `<SelectItem value="336">336 hours (14 days)</SelectItem>` to the dropdown list in `EditProjectDialog.tsx`.
- No backend or calculation changes are needed; the existing comparison logic treats the threshold as a raw hour count.

## Verification
- Open a project's edit dialog and confirm the new "336 hours (14 days)" option appears and can be selected/saved.