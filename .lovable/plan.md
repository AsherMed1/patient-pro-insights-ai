

# Move Data Management to Settings (Admin Only)

## What Changes
Remove the "Data Management" collapsible section from the appointments filter area and relocate it to a new "Data Management" tab in the Settings page, visible only to admin users.

## Why
Data import and insurance sync are administrative operations that don't belong in the day-to-day appointment filtering UI. Moving them to Settings keeps the appointment view clean and restricts access to admins.

## Technical Details

### 1. File: `src/components/appointments/AppointmentFilters.tsx`

Remove the entire "Data Management" collapsible block (lines 199-229), including the `isAdmin()` check, `Upload`/`ChevronDown` icons, `InsuranceSyncTrigger`, and the "Import CSV" button. Also remove the related props (`showImport`, `onShowImport`) if they are only used here.

### 2. File: `src/pages/UserSettings.tsx`

- Add a new "Data Management" tab (visible only when `role === 'admin'`)
- Update the grid columns count to accommodate the new tab
- Import `InsuranceSyncTrigger` and `AppointmentsCsvImport` components (or the import trigger button/logic)
- Add a card inside the new tab containing:
  - An "Import CSV" button that toggles the `AppointmentsCsvImport` component
  - The `InsuranceSyncTrigger` button
  - Brief description text explaining these admin tools
- The tab will use the `Upload` icon consistent with the current design

### 3. Props cleanup in `AppointmentFilters.tsx`

Remove the `showImport` and `onShowImport` props from the `AppointmentFilters` component interface if they were only used for the Data Management section. Update any parent components that pass these props accordingly.

