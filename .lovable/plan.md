# Diagnose & fix "Failed to fetch appointments" for project_user search

## What I already verified
- The two "Hawkins" rows exist in `all_appointments` with `project_name = 'Texas Vascular Institute'`, `review_status = 'approved'`, `is_reserved_block = false`, `is_superseded = false` — so the data is reachable in principle.
- RLS on `all_appointments` allows `project_user` when there is a matching row in `project_user_access` joined to `projects` on `project_name`.
- RLS on `projects` allows `project_user` to see only assigned projects (which the EXISTS subquery in the appointments policy depends on).
- No recent Postgres errors mention `hawkins`, `permission denied`, or `all_appointments`. The unrelated date-parse errors in the logs are from the intake parser, not from this query.

So the failure is almost certainly one of:
1. The signed-in user's `project_user_access` row doesn't actually map to the `projects.project_name = 'Texas Vascular Institute'` (typo, trailing space, wrong project_id, or it was never inserted).
2. The PostgREST request itself is being rejected (network/400) for a reason we can only see in the browser network tab.

## Information I need from you (one is enough)
- The **email** of the project_user account you tested with, so I can run `SELECT` against `project_user_access` joined to `projects` and confirm the assignment row exists and the name matches exactly.
- OR the **failed request response** from the browser: open DevTools → Network → filter `all_appointments` → click the red/failed request → copy the response body (the PostgREST `message` / `code` / `details`).

## Plan once I have that signal

### Case A — Assignment mismatch (most likely)
- Fix the `project_user_access` row so it points at the correct `projects.id` whose `project_name` is exactly `Texas Vascular Institute`.
- If a stale project row with a different name exists, consolidate it.
- Re-test search as the project_user.

### Case B — PostgREST query error
- Reproduce against the project_user session and read the exact error.
- Likely culprits to check in `src/components/AllAppointmentsManager.tsx`:
  - The chained `.or(...)` groups combined with `.not(...)` filters can produce a malformed PostgREST URL when RLS narrows the row set; verify the search path doesn't hit the same condition that's failing for admins silently.
  - The count query (line ~344) vs. the data query (line ~483) — whichever throws is the one whose `error` should be surfaced; we'll log `error.message`, `error.code`, `error.details`, `error.hint` in the catch and show them in the toast description for this debugging pass.
- Apply the targeted fix (most often: collapse the multiple `.or()` groups into a single grouped expression, or guard the search-term branch).

### Validation
- As admin: search `hawkins` in Texas Vascular Institute → still shows 2 results.
- As project_user assigned to Texas Vascular Institute: search `hawkins` → shows the same 2 results, no error toast.
- As project_user NOT assigned to Texas Vascular Institute: route is blocked by AuthGuard as today.

## Out of scope
- No UI redesign, no RLS rewrite unless Case A reveals a structural problem.
- No changes to admin/agent/VA behavior.
