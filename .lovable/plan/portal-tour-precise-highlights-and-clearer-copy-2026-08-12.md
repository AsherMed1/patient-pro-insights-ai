# Portal Tour: Precise Highlights and Clearer Copy

Refine the clinic Portal Tour so each step highlights exactly the control it describes, and reword the buckets step to match the tabs on screen.

## Copy changes

**Step 4 — Appointment buckets** (new wording):

"Appointments are organized by status: New — newly submitted appointments not yet reviewed. Needs Review — appointments requiring action or missing required information. Upcoming — reviewed appointments with a future date. Completed — appointments that have passed or been completed. All — every appointment in one place."

**Step 8 — retitled "Patient Pro Insights"**: "Click the Patient Pro Insights tab to expand or collapse the patient's medical, insurance, and demographic information."

## Highlight changes

| Step | Today | After |
|---|---|---|
| 5 Statuses | Whole patient card | The Status dropdown on the card |
| 8 Patient record | Whole patient card | The Patient Pro Insights header bar |
| 9 Notes | Whole patient card | The Internal Notes section (header + Add Note) |
| 10 Calendar | No anchor (centered card) | List/Calendar toggle, Day/Week/Month switch, and Reserve Time |

Step 10 highlights all three calendar controls at once so the trainee sees every function being described.

## Smoother transitions

- Longer, softer easing (cubic-bezier(0.22, 1, 0.36, 1), ~380ms) shared by spotlight, scrim, and card.
- Card fades out briefly and fades back in at its new position instead of gliding across long distances between distant anchors.
- Step text keeps its cross-fade; spotlight keeps the re-measure retry so it never blinks out during a section switch.

## Technical details

- `PortalTour.tsx`: support an optional `anchors: string[]` on a step, measuring each and rendering a spotlight per anchor (the scrim dimming comes from the first/union rect); card positions off the union rect. Timing/easing constants centralized.
- `portalTourSteps.ts`: update copy for steps 4 and 8; repoint step 5 to `status-dropdown`, step 8 to `pro-insights`, step 9 to `internal-notes`, step 10 to `['view-toggle', 'calendar-view-mode', 'reserve-time']`.
- New `data-tour` attributes (presentation-only, no logic touched):
  - `AppointmentCard.tsx` — Status select wrapper (~line 2035) as `status-dropdown`
  - `ParsedIntakeInfo.tsx` — Patient Pro Insights header (~line 618) as `pro-insights`
  - `AppointmentNotes.tsx` — Internal Notes container (~line 163) as `internal-notes`
  - `ProjectPortal.tsx` — list/calendar toggle as `view-toggle`, Day/Week/Month group as `calendar-view-mode`, Reserve Time button as `reserve-time`
- Steps 5, 8, and 9 target the first appointment card's controls; if a clinic has no appointments those anchors are absent and the tour falls back to the centered card, as it already does.
