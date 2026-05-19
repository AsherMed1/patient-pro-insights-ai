## Goal
Exempt ECCO Medical and Premier Vascular from the Review Queue, since these projects capture time preferences instead of real booked appointments and don't need verification.

## Changes

### 1. Webhook intake — `supabase/functions/ghl-webhook-handler/index.ts`
When inserting a new appointment, if `project_name` matches `ECCO Medical` or `Premier Vascular`, set `review_status = 'approved'` (auto-approve) instead of `'pending'`, and skip the Slack notification to `#appt-booked-verification`.

### 2. API intake — `supabase/functions/all-appointments-api/index.ts`
Same rule: on new insert for these two projects, default `review_status = 'approved'` and skip the Slack notify call.

### 3. UI safety net — `src/components/admin/ReviewQueue.tsx`
Add a `.not('project_name', 'in', '("ECCO Medical","Premier Vascular")')` filter to the fetch query so any historical pending rows for these projects are hidden from the queue.

### 4. Backfill (data update via insert tool)
Update existing `all_appointments` rows where `project_name IN ('ECCO Medical','Premier Vascular')` and `review_status = 'pending'` → set to `'approved'` so the queue clears.

## Notes
- Exact project name strings should match what's in the DB. I'll verify against `projects` table before writing (Premier Vascular memory mentions exact name "Premier Vascular"; ECCO memory mentions "ECCO Medical"). If they differ, I'll adjust the constant list.
- Centralize the exempt list as a small constant in each edge function for easy future additions.
- No schema migration needed.
