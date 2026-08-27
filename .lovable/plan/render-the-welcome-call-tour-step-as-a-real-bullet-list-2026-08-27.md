# Render the Welcome Call tour step as a real bullet list

The previous attempt (plain dash text + `whitespace-pre-line`) still reads as a paragraph. Render actual bullet list HTML so the two outcomes are visually distinct.

## Changes

**1. `src/components/tour/portalTourSteps.ts`** — extend the `PortalTourStep` interface with an optional `bullets?: string[]` field. Set it on the `welcome-call-attempt` step:

- intro `body`: `Select Welcome Call Attempt in the notes header. Choose Patient Answered or Patient Did Not Answer, add the required internal note, and save.`
- `bullets`: 
  - `Patient Answered: Marks the patient as successfully reached.`
  - `Patient Did Not Answer: Keeps the record open and sends the patient follow-up text, limited to once every 12 hours.`

**2. `src/components/tour/PortalTour.tsx`** — after the intro `<p>`, render a `<ul>` when `step.bullets` is present: each bullet as an `<li>` with a small bullet marker, using the same muted-foreground text styling. Remove the now-unneeded `\n` content and the `whitespace-pre-line` class on the intro paragraph (keep it as a normal paragraph). Other steps have no `bullets`, so they render exactly as before.

## Technical detail

- No new dependencies; presentation-only.
- Bullet list uses semantic `<ul>/<li>` so it's readable and accessible.
