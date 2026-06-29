## Verify and re-tag Bebinia Civil in GHL

### What we know
- DB row: `Bebinia Civil` / Richmond Vascular Center / `ghl_id=yZy7Ei3FxAdAXzlY1PhD` / `review_status=approved` / `ghl_approved_tag_sent_at=2026-06-05`.
- User reports no `approved` tag on the GHL contact.
- Stamp is set, so the hourly sweep (which filters `ghl_approved_tag_sent_at IS NULL`) will not touch her. This is exactly the gap the `force_ids` / `include_backfilled` path in `retry-missing-ghl-approved-tags` was built for — it re-verifies via GHL `GET /contacts/:id` and pushes the tag if missing.

### Step 1 — Verify + self-heal Bebinia (one call)
Invoke `retry-missing-ghl-approved-tags` with:
```json
{ "force_ids": ["bc6a518e-899b-413a-9e01-8aa6cfa5bf68"] }
```
Expected outcomes:
- If GHL already has the tag → `already_tagged: 1` (no write, stamp stays).
- If missing → function tags via `update-ghl-contact-tags` and refreshes the stamp; result `succeeded: 1`.
- If GHL `GET` fails (auth/permissions) → `failed: 1` with a clear reason in `failures[]`.

### Step 2 — Broader sweep of older "backfilled" approvals
Since Bebinia's stamp was set during the manual backfill, other Richmond/follow-up leads may be in the same state. Run once:
```json
{ "include_backfilled": true, "batch_size": 100 }
```
This re-verifies every approved row (not just NULL-stamp ones) and pushes the tag where GHL is actually missing it. Already-tagged rows are no-ops. Filters still exclude ECCO/Premier/Davis.

### Step 3 — Report back
Share the function's JSON response: `found / succeeded / already_tagged / failed / failures[]`. If anything fails, surface the GHL status code + reason verbatim so we can diagnose (e.g., expired API key for that project).

### Safety
- No schema/code changes.
- Function already verifies in GHL before writing → no double-tagging.
- Reversible: tags can be removed via `update-ghl-contact-tags` with `action: "remove"`.
- Hourly cron continues to handle any future NULL-stamp rows; this run handles the backfilled-stamp gap.

### Why not just edit the row
Clearing her stamp to let the cron pick her up would work but is slower (waits until `:07`) and doesn't surface the failure reason if GHL rejects. `force_ids` runs immediately and returns a verifiable result.
