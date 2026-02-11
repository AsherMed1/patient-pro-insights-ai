

# Plan: Replace Action Buttons with Icon-Only Row

## What Changes
Replace the vertically stacked "View Details", "View Insurance", and "Delete" buttons in the top-right corner of each appointment card with a compact horizontal row of icon-only buttons with tooltips.

## Layout Change

**Before**: Three buttons stacked vertically with text labels, taking significant vertical space
**After**: Three icon buttons in a horizontal row, each wrapped in a tooltip for discoverability

## Technical Details

### File: `src/components/appointments/AppointmentCard.tsx`

**Lines 1039-1088** -- Replace the vertical `flex-col` button group with a horizontal `flex-row` icon-only layout:

- Change `flex-col items-end space-y-1` to `flex-row items-center gap-1`
- **View Details**: Icon-only button using `size="icon"` with `Info` icon, wrapped in a `Tooltip` showing "View Details"
- **View Insurance**: Icon-only button using `size="icon"` with `Shield` icon (blue styling preserved), wrapped in a `Tooltip` showing "View Insurance"  
- **Delete**: Icon-only button using `size="icon"` with `Trash2` icon (red styling preserved), wrapped in a `Tooltip` showing "Delete", still inside the existing `AlertDialog` for confirmation
- Remove all `<span>` text labels from these buttons
- Keep all existing click handlers, conditional rendering, and the delete confirmation dialog unchanged

The buttons will be approximately 28x28px each (using `h-7 w-7` or similar small icon size), sitting in a single horizontal row that takes far less space than the current stacked layout.

