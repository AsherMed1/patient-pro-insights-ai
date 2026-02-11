

# Modern Icon-Only Toggle for List/Calendar Switch

## What Changes
Replace the current List/Calendar toggle buttons (which show icons + text labels) with a cleaner, icon-only toggle using just the List and Calendar icons -- no words.

## Technical Details

### File: `src/pages/ProjectPortal.tsx`

**Lines 460-488** -- Update the view toggle buttons:

1. Remove the text "List" (line 473) and "Calendar" (line 487) from the buttons
2. Remove `mr-2` from icon classNames since there's no adjacent text
3. Reduce `px-4` to `px-3` on the buttons for a tighter icon-only pill
4. Keep the existing rounded-full pill container, active/inactive color scheme, and transition behavior

Result: Two compact icon-only pill buttons side by side -- the active one highlighted in dark blue, the inactive one in subtle gray.

