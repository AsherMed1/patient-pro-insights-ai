# Use the full window width in the portal

## Why the side gutters exist

Every dashboard body in the portal is wrapped in a fixed `max-w-7xl mx-auto` container (1280px cap, centered). On a wider monitor the extra space becomes the empty red margins in your screenshot. Confirmed in:

- `src/pages/Index.tsx` — 4 wrappers (admin/agent, review-only, recapture-only, QA-specialist dashboards)
- `src/pages/ProjectPortal.tsx` — 4 wrappers (loading, error, sticky header row, main content)

## What changes

- Replace the hard 1280px cap with a full-width container that keeps comfortable side padding: `w-full mx-auto px-4 md:px-6` and a generous safety cap (`max-w-[1920px]`) so text lines don't stretch absurdly on ultrawide displays.
- Applies to both the admin portal (Index) and the client project portal, so tables like Recapture, Review Queue and QA Operations get the extra room and need far less horizontal scrolling.
- Sticky header, sticky nav and QA toolbar keep their current offsets; they already span full width via negative margins, so only the inner content container changes.

## Notes

- No data, business logic, or backend changes — layout only.
- Verify by loading the Recapture Worklist at 1920px wide: the table should extend to the window edges (minus padding) with no centered gutters.
