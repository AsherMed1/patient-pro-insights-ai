# Fix the cursive patient name in the portal

## What you're seeing

On the appointment card, the patient name ("Darla Clay") renders in a cursive/italic style while every other label on the card renders in the normal portal font.

## What I checked

- The stored value is plain text — the database holds `Darla Clay` as ordinary ASCII, so it is not styled Unicode characters coming from GoHighLevel.
- No `italic` class is applied to the name in the appointment card code; the name span only carries `font-medium`.

So the cause is not confirmed from the code alone — it is most likely a font-resolution fallback (the Inter web font not resolving for that element, e.g. blocked Google Fonts request or a browser extension restyling the field). The fix below makes the name immune to that regardless of the cause.

## The fix

1. Pin the patient name to the portal typeface explicitly: add `font-sans not-italic` to the name display element and to the inline name-edit input in the appointment card, so no inherited or fallback style can turn it cursive.
2. Do the same for the other places the patient name is shown as a heading (review queue row/detail header, QA queue patient cell) so the treatment is consistent.
3. Add a small safeguard in the global stylesheet: an explicit `font-family` + `font-style: normal` on the body/base layer, and a self-hosting-safe fallback stack ending in a guaranteed non-cursive `sans-serif`, so a failed Inter load never falls back to a script face anywhere in the portal.

## Verification

Load an appointment card in the preview, confirm the name renders in the same sans-serif face and weight as the rest of the card, and confirm the same after entering and leaving the inline name edit mode.

## Technical notes

Files touched: `src/components/appointments/AppointmentCard.tsx` (name span + edit `Input`), `src/components/admin/ReviewQueue.tsx` and `src/components/admin/QAOperationsQueue.tsx` (patient name cells), `src/index.css` (base-layer font-family/font-style guard). No data or business-logic changes.
