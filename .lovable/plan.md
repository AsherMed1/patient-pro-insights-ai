# Review Queue "Action failed" — verify the fix and close the remaining gaps

## What the logs show

Database error logs were checked directly for this turn:

- The `invalid input syntax for type uuid: ""` errors that blocked every Review Queue action occurred **2,560 times**, and the **last one was at 15:30:02 UTC today** — the exact minute the trigger fix (`recapture_mark_recovered_on_link`) was applied. There have been **no occurrences since**. The current function body uses the null-safe comparison and the trigger only fires when the recapture link column changes.
- So the setters' report almost certainly reflects attempts made before 15:30, or browser tabs that were open before the fix and still hold stale state.

Two **separate, still-active** errors turned up in the same log window and are not caused by the trigger:

1. `new row violates row-level security policy for table "all_appointments"` — repeated INSERTs of new appointments (fields: `ghl_id`, `project_name`, `review_status`, `status`, parsed intake JSON) are being rejected. These look like the GHL intake path, which means some new leads may not be landing in the Review Queue at all.
2. `permission denied for table projects` — repeated UPDATEs that set `insurance_id_link` are failing on the `projects` table permission check.

Both patterns are consistent with a caller using an anon/authenticated key where the service role key is expected. That is unverified until the specific caller is confirmed, so it is the first step below rather than a stated cause.

## Plan

### 1. Confirm the Review Queue is actually working again (first)
- Ask one setter to hard-refresh (Ctrl/Cmd+Shift+R) and retry Approve, Decline, OON, and Pending Review on one row.
- In parallel, re-check the error log for any `uuid: ""` occurrence after 15:30:02. If none and the setter still sees "Action failed", capture the exact toast text — it will be a different error and gets diagnosed on its own.

### 2. Surface the real error instead of a bare "Action failed"
Right now the toast shows only `e.message`, which hides the Postgres code, hint, and details. Update the Review Queue error handling so the toast and the console log include the Supabase error `code`, `details`, and `hint`. This makes the next incident diagnosable in one screenshot instead of a log dig.

### 3. Fix the failing appointment INSERTs (RLS violation)
- Identify which caller is inserting with a non-service key by matching the failing column set against the intake code paths.
- Correct that caller to use the service role client (or add the precise policy/grant it needs, if it is genuinely a user-facing insert).
- Backfill: list appointments that GHL sent during the failure window but that never landed, and re-ingest them so nothing is silently missing from the Review Queue.

### 4. Fix the `permission denied for table projects` updates
- Trace the `insurance_id_link` update path (matches on `project_name` + `lead_name`) and give it the correct client/grants so insurance card links stop failing.

## Technical notes

- Trigger already corrected: `public.recapture_mark_recovered_on_link()` now uses `IS DISTINCT FROM`, and `recapture_mark_recovered_on_link_trg` is scoped to `UPDATE OF recaptured_from_appointment_id`. No further migration is needed for that specific bug.
- Steps 3 and 4 may need a migration (grants/policies) or an edge function change depending on what the caller trace shows; the migration would be presented for approval separately.
- No schema change is required for step 2.
