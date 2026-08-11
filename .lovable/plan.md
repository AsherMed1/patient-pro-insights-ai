# Hide unapproved appointments from the calendar for everyone

## Change

Right now the calendar hides unapproved appointments (Pending Review, Declined, OON, Dismissed) from clinic users, but still shows them to admins and agents with an "UNAPPROVED" marker — which is why you can still see Cathlene Winston.

Make it uniform: no role sees unapproved appointments on the calendar. Unapproved records live only in the Review Queue. Reserved time blocks stay visible for everyone regardless of review status.

## Steps

1. Remove the role-based exemption in the calendar data source so the approved-only gate always applies (approved records plus reserved time blocks).
2. Remove the now-dead "UNAPPROVED" markers from the Day, Week, Month and Upcoming Events views.
3. Verify in the preview: load the Aug 11 week on the affected clinic and confirm Cathlene Winston no longer appears, other appointments and reserved blocks still render, and no console errors.

## Technical notes

- `src/hooks/useCalendarAppointments.tsx`: drop the `includeUnapproved` / `useRole` branch and always apply `.or('review_status.eq.approved,is_reserved_block.eq.true')`.
- `CalendarDayView.tsx`, `CalendarWeekView.tsx`, `CalendarMonthView.tsx`, `UpcomingEventsPanel.tsx`: remove the `review_status !== 'approved'` badge blocks.
- Excel export keeps the approved-only filter added previously.
- No database, RLS, or Review Queue changes.
