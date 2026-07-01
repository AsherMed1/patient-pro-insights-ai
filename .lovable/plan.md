# Fix: Premier / ECCO / Premier Vascular Surgery invisible in Review Queue

## Problem
Yesterday's fix routed self-booked Premier Vascular, Premier Vascular Surgery, ECCO Medical, and Davis Vein leads through `review_status='pending'` instead of auto-approving. Backend confirmed: Test Johann (`khbh4ZNk7Qm958IhWvry`, Premier Vascular) is in the DB with `review_status='pending'`.

However `src/components/admin/ReviewQueue.tsx` still has a leftover UI filter from when those projects were exempt:

- Line 246 (rows fetch): `.not('project_name', 'in', '("ECCO Medical","Premier Vascular","Premier Vascular Surgery")')`
- Line 293 (pending/declined counts): same exclusion

So the pending rows exist but the queue silently hides them. Davis Vein was never in this list, so Davis leads already appear correctly — confirming the exclusion is the sole cause.

## Change
Delete both `.not('project_name', 'in', ...)` clauses in `src/components/admin/ReviewQueue.tsx` (lines 246 and 293). No other logic changes — sort, search, project filter, RLS, and approve/decline flows all already work generically.

## Verification
1. Load Admin → Review Queue as Johann (admin).
2. Confirm "Test Johann" Premier Vascular pending row (`3052618d-49c2-43a2-9b7d-06231ec62e92`) now appears in the Pending tab.
3. Confirm the Pending count badge increases to include the previously hidden Premier/ECCO/PVS rows.
4. Approve the test row and confirm it disappears from Pending and becomes visible in Kristi's Premier Vascular client portal.

## Out of scope
- No backend, RLS, edge function, or schema changes.
- No change to Setter Submitted auto-approve behavior.
- Historical already-approved Premier/ECCO/PVS rows are unaffected.
