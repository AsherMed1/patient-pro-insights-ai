

## Add "Do Not Call" to Completed Tab Backend Queries

The issue is that the backend Supabase queries do not include "Do Not Call" as a completed/terminal status. The client-side `filterAppointments` in `utils.ts` already handles it correctly, but the actual database queries in `AllAppointmentsManager.tsx` do not.

### What needs to change

**File: `src/components/AllAppointmentsManager.tsx`** -- 6 locations need updating:

1. **Completed tab count query** (line 613): Add `status.ilike.do not call` to the `.or()` filter
2. **Completed tab data query** (line 466): Add `status.ilike.do not call` to the `.or()` filter
3. **Completed count in fetchAppointments** (line 333): Add `status.ilike.do not call` to the `.or()` filter
4. **New tab count query** (line 585-587): Add `.not('status', 'ilike', 'do not call')` to exclude from New
5. **Needs Review queries** (lines 590-597 and 441-450): Add `.not('status', 'ilike', 'do not call')` to exclude from Needs Review
6. **Upcoming/Future queries** (lines 600-609 and 451-462): Add `.not('status', 'ilike', 'do not call')` to exclude from Upcoming

All six spots follow the same pattern already used for `cancelled`, `no show`, `showed`, `won`, and `oon`.

