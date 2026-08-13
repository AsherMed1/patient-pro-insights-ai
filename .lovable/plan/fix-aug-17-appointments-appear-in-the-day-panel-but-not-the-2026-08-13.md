# Fix: Aug 17 appointments appear in the day panel but not the month grid

## What's happening

Nashville Vascular has two appointments on Aug 17, 2026 (Tiffany Taylor 10:30, Julie Gapastione 11:10). Both are still `review_status = 'pending'` — they have not been approved in the Review Queue yet.

The month/week/day grid correctly hides unapproved records (per the Review Queue rule: unapproved appointments live only in the Review Queue). The side "Events" panel does **not** apply that filter, so it leaks the pending records — which is why the day looks empty until you click it, and then a patient appears.

So the grid is right and the panel is the bug.

## Fix

Apply the same approved-only gate to the events panel that the calendar grid already uses: show records where `review_status = 'approved'` or the row is a reserved time block. After the fix, Aug 17 will read as empty in both places until those two appointments are approved.

Separately, the clinic should approve Tiffany Taylor and Julie Gapastione in the Review Queue if they are legitimate — they will then show everywhere.

## Technical notes

- `src/components/appointments/UpcomingEventsPanel.tsx`: add `.or('review_status.eq.approved,is_reserved_block.eq.true')` to the `all_appointments` query, matching `useCalendarAppointments.tsx`.
- No database, RLS, or Review Queue changes.
- Verify in the preview: Nashville Vascular calendar, Aug 17 — day panel and month cell both show no appointments; other days still render normally.
