## Problem

Clicking "Run audit" returns `Edge Function returned a non-2xx status code`. Edge function logs show the function boots, logs `[audit] project= undefined since= undefined sig= both`, then nothing — it silently times out (Supabase edge functions have a ~150s wall-clock limit).

Why it times out, given current data:
- **267** reserved blocks in the incident window
- **1,907** candidate appointments (`was_ever_confirmed=true`, active status)
- Signature A loops 1,907 candidates and runs a `security_audit_log` query per candidate (~1,907 sequential queries)
- Signature B loops 267 blocks and runs a candidate query per block (~267 sequential queries)
- GHL ground-truth check then does **one HTTP call per suspect, sequentially** (could be hundreds of calls × ~300ms each)

Together this exceeds the timeout, so the function never returns and the client sees a generic non-2xx error.

For Eugene specifically the single-appointment restore card does not depend on this audit — it can already be exercised. But the audit itself is broken at scale and needs to be fixed for the bulk remediation to be usable.

## Plan

Rewrite `audit-time-block-cancellations` to be timeout-safe and observable.

### 1. Replace per-row queries with batched joins

- **Signature A**: do a single `security_audit_log` query in the candidate window, grouped by `details->>appointment_id`, and join in memory against the candidate set instead of querying per-row. Falls from ~1,907 round-trips to 2.
- **Signature B**: pull all 267 blocks once, then one `all_appointments` query with `.in()` over the unique `(project_name, calendar_name, date_of_appointment)` triples — or a single SQL RPC that does the overlap join server-side. Falls from ~267 round-trips to 1.

### 2. Parallelize the GHL ground-truth check

- Run GHL fetches with a concurrency pool of ~8 (Promise pool), per-request 8s timeout via `AbortController`, and skip the check entirely if `check_ghl=false`.
- Default `check_ghl` to **false** for the dashboard "Run audit" button, and add a separate "Verify against GHL" button that runs the GHL pass on the already-fetched suspect list.

### 3. Add safety rails

- Hard cap the suspect set processed for GHL at 500 per call; return `truncated: true` if exceeded so the UI can paginate.
- Wrap the handler in try/catch around each phase and log `[audit] phase=A done in Xms` / `phase=B done in Xms` / `phase=ghl done in Xms` so future timeouts are diagnosable from logs.
- Ensure all error paths return JSON 200 with `success: false, error, phase` instead of crashing — that way the UI shows the real error string instead of "non-2xx".

### 4. Dashboard tweaks (`src/pages/admin/BlockIncidentRecovery.tsx`)

- Add a **"Verify against GHL"** button next to "Run audit"; default audit run no longer hits GHL.
- Show the `truncated` flag and a hint to filter by project if so.
- Surface the server-side `error` field in the toast when `success: false`.

### 5. No DB schema changes

The fix is entirely in the edge function and the dashboard. No migration needed.

## Files

- `supabase/functions/audit-time-block-cancellations/index.ts` — rewrite Signature A/B queries to be batched; add concurrency-limited GHL check; phase timing logs; structured error responses.
- `src/pages/admin/BlockIncidentRecovery.tsx` — split audit into "Run audit (fast)" + "Verify against GHL"; show truncation + server error.

## Expected outcome

- "Run audit" returns in a few seconds with the suspect counts (no GHL check).
- "Verify against GHL" then runs the ground-truth pass with parallelism, completes in well under the timeout for the current ~hundreds-of-suspects volume, and reports per-project `ghl_cancelled` / `ghl_deleted` counts.
- Single-appointment restore for Eugene Schneeberger remains independently usable and is unaffected by this change.
