## Re-apply Joe Leydon status update

**What happened:** My first data-change call bundled the UPDATE with an audit-note INSERT that failed on a wrong column name. Because both statements ran in one transaction, the UPDATE was rolled back. The follow-up note insert succeeded on its own, but the status was never actually flipped — DB still shows `Welcome Call` with `updated_at = 2026-07-07`.

**Fix:** Run the UPDATE on its own:
- `all_appointments.id = 1cfab93a...` → `status = 'Cancelled'`, `internal_process_complete = true`, `updated_at = now()`.

The audit note is already logged. No code changes.