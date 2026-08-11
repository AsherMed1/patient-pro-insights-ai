# Hide unapproved appointments from clinic calendars

## What's wrong

Verified in the code and database:

- The portal appointment list already filters to approved records only (`AllAppointmentsManager`, portal stats).
- The calendar does **not**. `useCalendarAppointments` fetches every appointment in the date range with no approval filter, so Pending Review, Declined, OON and Dismissed records show on the clinic calendar (Day/Week/Month views and the Upcoming Events side panel).
- Current unapproved, non-block records in the database: 20 pending, 492 declined, 424 OON, 22 dismissed — all visible on clinic calendars today.
- One more gap: the "Export to Excel" query in the appointments manager omits the approved filter, so unapproved rows leak into exports.

Important nuance: 1,323 reserved time blocks carry `review_status = 'pending'`. Those are clinic-created calendar blocks and must stay visible — the filter has to exempt them.

## Fix

1. **Calendar data source** — in `useCalendarAppointments`, only return records that are approved, plus reserved time blocks regardless of review status. This covers Day, Week, Month, the detail view and the Upcoming Events panel, since they all read from this hook.
2. **Admin visibility** — admins and agents keep seeing unapproved records on the calendar (they need them), rendered with a clear "Unapproved" marker so they are never mistaken for cleared appointments. Clinic (project) users, setters and everyone else see approved only.
3. **Export parity** — add the approved filter to the Excel export query so exports match what the list shows.
4. **Sweep for other clinic-facing views** — confirm every remaining surface that reads `all_appointments` for a clinic applies the same gate (portal stats, appointment list, calendar, export, reporting helpers), and add the filter anywhere it is missing.

Because unapproved appointments no longer appear on the clinic calendar, clinic users cannot open, move, or work them. Once a record is approved in the Review Queue, it appears on the calendar and in the list on the next load, as it does today.

## Technical notes

- `src/hooks/useCalendarAppointments.tsx`: add `.or('review_status.eq.approved,is_reserved_block.eq.true')` to the query, gated by role — the hook takes an `includeUnapproved` option that `CalendarDetailView` / `CalendarSidePanel` set from `useRole` (`admin`/`agent`).
- Unapproved rows for admins get a badge in `CalendarDayView` / `CalendarWeekView` / `CalendarMonthView` event blocks.
- `src/components/AllAppointmentsManager.tsx` (~line 1405): add `.eq('review_status','approved')` to the export query.
- No database or RLS changes; this is a query/presentation fix.

## Validation

- Sign in as a clinic user on Champion Heart and Vascular Center: an appointment sitting in Pending Review is absent from Day/Week/Month and the Upcoming panel; reserved blocks still render.
- Approve it in the Review Queue: it appears on the calendar and in the appointment list.
- As admin: the same record is visible with the Unapproved marker.
- Export to Excel returns approved rows only.
