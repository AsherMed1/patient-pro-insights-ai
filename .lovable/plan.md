## Problem

Clinic users on Liberty Joint & Vascular see **"Failed to update appointment status"** when marking a patient OON. The DB write is being aborted before it can commit.

**Root cause candidate:** the `qa_ingest_terminal_status_trg` trigger we added with the QA Operations Queue rollout. It's an `AFTER UPDATE OF status` trigger that calls `qa_upsert_case()`, which inserts into `qa_cases` and `qa_case_activity`. If ANY step in that trigger raises an exception, Postgres aborts the entire status update transaction and the portal shows the generic error.

Evidence:
- Joseph Brant's DB row `05363f3d` is already `status='OON'` (set before the QA trigger was installed).
- `qa_cases` table is completely empty — no case has ever been inserted, even though multiple OON/Cancelled/No Show transitions must have happened since deploy. Strong signal the trigger is raising and being rolled back on every terminal transition.
- The only OON-specific code paths in `AllAppointmentsManager.updateAppointmentStatus` that can propagate a throw are the DB `UPDATE` itself and its trigger chain. Front-end note inserts and edge-function calls do not throw here.

Marie Latimer isn't in `all_appointments` at all — likely a different spelling or already deleted; I'll confirm and locate her once we look up phone/GHL id.

## Fix

### 1. Make the QA ingestion trigger fault-tolerant (primary fix)

Rewrite `qa_ingest_terminal_status()` so the entire body is wrapped in `BEGIN … EXCEPTION WHEN OTHERS THEN … END`. On any failure it logs to `security_audit_log` (event `qa_ingest_failed` with SQLSTATE + message + appointment id) and returns `NEW` so the appointment update still commits.

Do the same wrap inside `qa_upsert_case()` at the top level so a bad row in `qa_cases`/`qa_case_activity` cannot cascade up.

Rule: QA queue ingestion is an observability side-effect. It must never block a clinical status change.

### 2. Add grants that the QA tables are missing

`qa_cases`, `qa_case_activity`, `qa_case_notes` currently have zero table-level `GRANT`s. That's fine while triggers run SECURITY DEFINER as `postgres`, but it will bite us the moment any code path touches these tables from a normal client. Add:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qa_cases        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qa_case_activity TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qa_case_notes    TO authenticated;
GRANT ALL ON public.qa_cases, public.qa_case_activity, public.qa_case_notes TO service_role;
```

RLS policies stay unchanged — they still gate real access.

### 3. Reproduce & verify

- Locate the actual PG error by running the appointment update as service role and inspecting `security_audit_log` for the new `qa_ingest_failed` rows to know what was breaking (so we can properly fix it, not just swallow it).
- Manually flip Joseph Brant `cfa151e7` (the currently-Confirmed duplicate) to `OON` on the clinic's behalf once the trigger is safe, and undo/normalize the GHL side (I inadvertently sent a `cancelled` sync to GHL while investigating; will reconcile).
- Look up Marie Latimer by phone/GHL id and confirm her record + set OON if needed.
- Ask the clinic to retry OON in the portal to confirm no toast error.

### 4. Follow-up if the real error is a bug (not just a swallow-worthy edge case)

Once step 3 surfaces the SQLSTATE, patch the underlying issue in `qa_upsert_case`/`qa_ingest_terminal_status` (e.g., a bad enum value, a NULL project_name, etc.) so QA cases actually start populating. The fault-tolerant wrapper stays either way as defense in depth.

## Files touched

- `supabase/migrations/<new>.sql` — wrap trigger bodies in EXCEPTION handlers, add the three GRANTs.
- Data fixes for Joseph Brant + Marie Latimer via `supabase--insert` (no code).

## Not changing

- QA queue UI, ControlHub bridge, RLS policies, all other appointment triggers.
- Front-end `updateAppointmentStatus` flow — it's correct; the failure is server-side.
