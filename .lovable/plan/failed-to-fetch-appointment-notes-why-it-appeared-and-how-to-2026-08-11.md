# "Failed to fetch appointment notes" — why it appeared and how to stop it

## What I found

The notes query itself is fine (it filters on an indexed column). The error is collateral damage from database overload:

- The Postgres error log for the last window shows nothing but `canceling statement due to statement timeout` — repeated dozens of times, back to back.
- The slow-query ranking shows a handful of small polling queries dominating the whole database:
  - `all_calls` (agent/duration/date, project filter) — 412,230 calls, 854 ms average
  - `new_leads` (date/updated_at, project filter) — 432,446 calls, 691 ms average
  - `all_calls` (call_datetime/updated_at) — 432,479 calls, 572 ms average
  - `all_appointments` (date_appointment_created/updated_at) — 401,011 calls, 568 ms average
  - `all_appointments` distinct project list — 44,340 calls, 2.4 s average
- With the database at that load, any request can exceed the 8-second statement timeout — including the notes fetch on a card, which then shows the red toast.

So this is not a permissions or code regression in notes; it is throughput. The portal is polling a few "has anything changed?" queries far too often, from every open tab, and each poll re-reads large tables.

## The fix

1. **Cut the polling frequency and scope.** The freshness checks on `all_calls`, `new_leads` and `all_appointments` currently run on short intervals per open portal. Move them to a single shared check per tab, slow the interval substantially, and pause it entirely while the tab is hidden.
2. **Stop the per-card notes fetch storm.** With 50 appointment cards on screen, each card independently queries `appointment_notes`. Load notes once for the visible page in one batched query, or defer the fetch until a card's notes section is actually opened.
3. **Make the remaining polls cheap.** The project-list query scans `all_appointments` for distinct project names at 2.4 s average; source it from the `projects` table instead (already the pattern used by the appointment filters).
4. **Add the missing supporting indexes** for the polling queries that still remain, so a freshness check is an index probe rather than a scan:
   - `all_calls (project_name, updated_at desc)` and `all_calls (project_name, date desc)`
   - `new_leads (project_name, updated_at desc)`
   - `all_appointments (project_name, updated_at desc)`
5. **Make the notes toast non-alarming.** On a timeout, retry once quietly before showing an error, so a single slow response doesn't produce a red box mid-review.

## Technical notes

- Polling lives in the per-project data hooks (`useLeads`, `useGhlCallSync`/calls hooks, `useMasterDatabase`) plus the 30 s intervals in `ReviewQueue.tsx` and `useAutoIntakeParsing.tsx`; consolidate their timers behind one visibility-aware scheduler.
- Notes fetching is `useAppointmentNotes(appointmentId)` called from `AppointmentCard` and `DetailedAppointmentView`; batching means one `in('appointment_id', ids)` query at the list level, with the hook reading from that cache.
- New indexes go in a migration; they are additive and safe to apply during business hours (`CREATE INDEX CONCURRENTLY`).
- No schema, RLS, or workflow changes.
