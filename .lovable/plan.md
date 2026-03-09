

## Fix: "Rescheduled" Appointments Stuck in Needs Review

### Problem
Appointments with status "Rescheduled" and a past date are landing in the "Needs Review" tab because "Rescheduled" isn't in the exclusion list for that tab's query. These are old appointments that were rescheduled — they should route to the **Completed** tab alongside other terminal statuses.

### Solution
Add "Rescheduled" to the `completedStatuses` list so it routes to the Completed tab. A rescheduled appointment represents a closed record (the patient has a new appointment elsewhere), so it belongs with other terminal statuses.

### Changes

**File: `src/components/AllAppointmentsManager.tsx`** — 3 locations

1. **Needs-review count query** (~line 605): Add `.not('status', 'ilike', 'rescheduled')`
2. **Needs-review data query** (~line 455): Add `.not('status', 'ilike', 'rescheduled')`
3. **Needs-review tab count query** (~line 309 area): Add `.not('status', 'ilike', 'rescheduled')`
4. **Completed/past query** (~lines 470, 622): Add `status.ilike.rescheduled` to the OR condition

**File: `src/components/appointments/utils.ts`** — 1 location

5. **Client-side filter** (line 97): Add `'rescheduled'` to the `completedStatuses` array

This ensures "Rescheduled" appointments are excluded from Needs Review and included in Completed across both database queries and client-side filtering.

