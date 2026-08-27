# Update the "Logging a Welcome Call" tour step copy

Reword the Welcome Call tour step body to the shorter, bulleted format the user provided, and make the tour card render line breaks so the bullets show on their own lines.

## Copy change

`src/components/tour/portalTourSteps.ts` — step `welcome-call-attempt` (line ~89), replace `body` with:

```
Select Welcome Call Attempt in the notes header. Choose Patient Answered or Patient Did Not Answer, add the required internal note, and save.

- Patient Answered: Marks the patient as successfully reached.
- Patient Did Not Answer: Keeps the record open and sends the patient follow-up text, limited to once every 12 hours.
```

The title stays "Logging a Welcome Call". The anchor, section, and placement are unchanged.

## Rendering change

`src/components/tour/PortalTour.tsx` — line 324, the body `<p>` currently has `className="mt-2 text-sm leading-relaxed text-muted-foreground"`. Add `whitespace-pre-line` so the `\n` characters in the body render as line breaks and the dash-bullets sit on their own lines. This affects every tour step but is safe: existing single-paragraph bodies contain no newlines, so they render exactly as before.

## Technical detail

- No new dependencies, no logic touched — presentation-only copy + one Tailwind class.
- The bullet dashes are plain text (`- `), which reads cleanly as a bullet list without adding a markdown renderer.
