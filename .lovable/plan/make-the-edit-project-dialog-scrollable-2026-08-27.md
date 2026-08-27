# Make the Edit Project dialog scrollable

## What's wrong

The **Edit Project** dialog (`src/components/projects/EditProjectDialog.tsx`) stacks many form fields plus the Notice rules list (`ShortNoticeRules`). The shared `DialogContent` (`src/components/ui/dialog.tsx`) is a fixed-centered box with no height cap or overflow, so when the content is taller than the viewport the header and the Cancel / Update Project buttons get clipped off-screen. The only way to see everything today is to zoom the browser out.

## Fix

Give the Edit Project dialog its own max height and an internal scroll area, and let the Notice rules list scroll independently so a long rule set doesn't push the footer off-screen.

1. **`src/components/projects/EditProjectDialog.tsx`** — pass a className to `DialogContent` so this dialog (only) gets `max-h-[90vh] overflow-y-auto`. Keep the shared dialog component untouched so every other dialog in the app is unaffected.
   - Pin the header and footer sticky within that scroll container so the title and the Cancel / Update Project buttons stay reachable while scrolling: `DialogHeader` gets `sticky top-0 z-10 bg-background`, `DialogFooter` gets `sticky bottom-0 z-10 bg-background`.
   - Add a small bottom border to the sticky header and top border to the sticky footer so scrolled content doesn't bleed through.

2. **`src/components/projects/ShortNoticeRules.tsx`** — cap the rules list with `max-h-[240px] overflow-y-auto` on the existing `space-y-2` container that holds the rule rows and the account-default row. The "Add rule" controls stay below the list, outside the scroll area, so they're always reachable. This keeps a large rule set from making the whole dialog tall in the first place.

## Validation

Open the Edit Project dialog for a clinic with several notice rules (e.g. the Ally Vascular project shown in the screenshots). At a normal 100% zoom:
- The dialog fits within the viewport (no clipping of header or footer).
- Scrolling inside the dialog reaches every field and the footer buttons.
- The Notice rules list scrolls on its own when there are many rules; the Add-rule row stays pinned beneath it.

Files: `src/components/projects/EditProjectDialog.tsx`, `src/components/projects/ShortNoticeRules.tsx`.
