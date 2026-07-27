## Goal
Superseded appointment records (the yellow "Superseded by a newer appointment" cards) should never appear in the portal — for any user, in any list or count.

## What's happening now
`src/components/AllAppointmentsManager.tsx` filters out reserved blocks on its main list, but the primary `fetchAppointments()` count query and data query do **not** exclude `is_superseded`, so locked duplicates render in project portals. Several sibling queries (calendar, upcoming events, review queue, some tab counts) already exclude them, which is why it looks inconsistent.

## Changes

1. **`src/components/AllAppointmentsManager.tsx`**
   - Add `.or('is_superseded.is.null,is_superseded.eq.false')` to the main `fetchAppointments()` count query and data query.
   - Audit the remaining `all_appointments` SELECTs in the file (tab counts, search/lookup, export) and add the same exclusion to any read that feeds a visible list, count, or export.

2. **`src/pages/ProjectPortal.tsx`**
   - Add the same exclusion to `fetchAppointmentStats()` so headline stats match the visible list.

3. **`src/components/projects/ProjectDetailedDashboard.tsx`**
   - Add the same exclusion to its two `all_appointments` queries so the detailed stats modal agrees.

4. **`src/components/appointments/AppointmentCard.tsx`**
   - Leave the superseded banner/lock code in place (harmless fallback if a superseded row ever reaches the UI), no visual change needed.

## Notes
- Purely a read-filter change: no data is deleted and the `is_superseded` flag/trigger behaviour stays as-is.
- Since the flag is set by the `mark_superseded_on_change` trigger, historical rows already backfilled will drop out of view immediately.
