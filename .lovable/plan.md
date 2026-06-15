# Fix Manage Project Access Dialog Overflow

## Problem
The "Manage Project Access" modal in User Management lists 50+ projects and grows taller than the viewport. The footer (Cancel / Save Changes) and bottom rows get cut off, forcing users to zoom the browser out to 50% to interact with the dialog.

## Fix
Update `src/components/ProjectUserManager.tsx`:

1. Constrain the `DialogContent` height so it never exceeds the viewport:
   - Add `max-h-[85vh]` and `flex flex-col` to the existing `max-w-md` classes.
2. Make only the project list scroll, keeping the header and footer pinned:
   - Wrap the project rows (`projects.map(...)` block) in a scrollable container: `max-h-[60vh] overflow-y-auto pr-1`.
   - Keep the action row (Cancel / Save Changes) outside the scroll area so it's always visible.
3. Minor: add a subtle top border to the footer row (`border-t pt-4`) so the pinned footer reads as separate from the scrollable list.

No logic, data, or permission behavior changes — purely layout/presentation so the dialog fits any screen and the Save button is always reachable.
