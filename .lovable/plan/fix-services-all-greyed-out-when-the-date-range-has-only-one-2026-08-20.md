# Fix: Services all greyed out when the date range has only one appointment

## What's happening

The Services dropdown grey-out logic uses the same "ignore one-off values" rule for two different jobs:

- Building the full clinic service list (where the rule is useful — it hides AI mis-parses like "TKR" or "null").
- Deciding which services have appointments inside the selected date range (where the rule is wrong).

Because a service needs at least 2 appointments to count, a day with a single GAE appointment yields zero qualifying services, so every entry renders disabled — exactly what the screenshot shows.

## The fix

In `src/components/appointments/AppointmentFilters.tsx`:

- Keep the minimum-occurrence threshold for the full service list only (junk suppression stays intact).
- Drop the threshold for the date-scoped "active" set: any service with at least 1 appointment in the range is enabled.
- Restrict the active set to services already present in the full list, so a one-off mis-parse inside the range still can't appear as a new option — it just won't enable something that isn't listed.
- Leave the existing behavior intact: full clinic list always visible, the currently selected service always enabled.

## Verification

With "Today" selected on NG Vascular and Vein Center (one GAE appointment), GAE is enabled and selectable while PAD, PAE, and PFE stay greyed out.
