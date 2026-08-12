# Adjust Portal Tour Card Position for Status Dropdown

## What to change
Move the tour explanation card for Step 5 ("Understanding statuses") from above the Status dropdown to below it so it no longer covers the **Status** label.

## How
1. In `src/components/tour/portalTourSteps.ts`, change the `placement` for the "Understanding statuses" step (the `anchor: 'status-dropdown'` step) from `'top'` to `'bottom'`.
2. Leave the `data-tour="status-dropdown"` anchor in `src/components/appointments/AppointmentCard.tsx` unchanged; the highlight ring will still frame the Status dropdown and its label, while the card itself renders below.

## Verification
After the change, restart or refresh the preview, start the tour, and navigate to Step 5. The tour card should appear below the dropdown and the **Status** title should remain fully visible.
