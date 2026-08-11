# Portal Tour only in Help menu

Keep only the Portal Tour in the clinic portal's Help button; remove the Training Videos entry.

## Changes

**`src/components/help/PortalHelpMenu.tsx`** — slim the menu down to a single item:
- Remove the "Training videos" `DropdownMenuItem`.
- Remove the video `Dialog`, the `VideoGallery` import, the `Input` import, and the `useState` for `videosOpen`/`search`.
- Drop the now-unused `projectName` prop and its references (or keep the prop on the interface if `ProjectHeader`/callers pass it, to avoid touching call sites — but since callers can be updated trivially, remove it for cleanliness).
- Relabel the dropdown header from "Help & training" to "Help".

**`src/components/tour/portalTourSteps.tsx`** — update the final wrap-up step body:
- From: "That is the tour. You can restart it any time from this Help menu, which also holds our training videos."
- To: "That is the tour. You can restart it any time from this Help menu."

**Callers** — if `projectName` is removed from `PortalHelpMenuProps`, update any call site in `PortalHeader.tsx` (or wherever `PortalHelpMenu` is mounted) to stop passing it.

## Out of scope
- No database, no schema, no logic changes.
- Training videos / `help_videos` table and the admin `VideoGallery` manager are untouched — only the clinic-portal Help menu drops the entry.
