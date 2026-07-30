## What I found (verified in the database)

Every contact you listed is Premier Vascular, and each falls into one of two buckets:

**Bucket A — Approved in the Review Queue, but the "approved" tag never landed in GHL**
Luis Gonzalez, Angela Rivera, Navpreet Kaur, Penprapa/Pam Ratanavong, Raponsa Farley. All have `review_status='approved'` (approved by real people: Staecy Peña, Lucas Gianoli, Katherine A., Dean Lunderstedt) but `ghl_approved_tag_sent_at` is NULL — the portal never confirmed the tag.

**Bucket B — Never approved at all, so no tag will ever come**
- OON: Sophia Williams, Marie Smith, Rose Daniel
- Declined: M. Lynn Doane, Walter Banks

These are correctly not approved — but the GHL workflow's Wait step only listens for `approved`, so they sit there forever with no exit path.

### Root causes

1. **The hourly retry sweep skips the exact projects that need it.** `retry-missing-ghl-approved-tags` has a hardcoded `EXEMPT_PROJECTS` list: ECCO Medical, Premier Vascular, Premier Vascular Surgery, Davis Vein & Vascular. That exemption is stale — those projects used to bypass the Review Queue, but they now route through it. So when the UI tag push fails, nothing ever retries it. The numbers confirm this exactly: over the last 90 days, missing approved tags are **ECCO 37, Premier Vascular 35, Davis 31**, and essentially **0 everywhere else** (1 for Georgia Endovascular). 103 stuck rows, all in the exempt list.

2. **No exit tag on OON.** Decline already pushes `appointment-declined` + reason tags to GHL. OON pushes Slack + status webhook + a note, but **no GHL tag**, so OON contacts have nothing to break them out of the Wait step.

3. **A stamped row can still be untagged.** Raponsa Farley has a stamp dated 2026-06-08 (from an earlier backfill) yet is still stuck — meaning the stamp was written without the tag actually being present in GHL. The sweep only re-verifies these when explicitly asked (`include_backfilled`).

## The fix

**1. Remove the stale exemption (root cause)**
Delete `EXEMPT_PROJECTS` from `supabase/functions/retry-missing-ghl-approved-tags/index.ts` and its query filter. Every approved row with a `ghl_id` becomes eligible for the hourly retry, regardless of project. The function already verifies against GHL before pushing, so re-including these projects is safe and idempotent.

**2. Add a GHL exit tag for OON**
In `ReviewQueue.tsx`, the OON branch gets the same treatment the decline branch already has: push an `appointment-oon` tag (plus the existing Slack/webhook/note side effects, unchanged). This gives GHL a signal to route OON contacts out of the Wait step.

**3. Drain the current backlog**
Run the sweep with a large batch and `include_backfilled: true` so it re-verifies stamped-but-untagged rows like Raponsa Farley, then re-run until the count of approved rows with a NULL stamp reaches zero. Verify by re-querying the per-project missing counts.

**4. Make silent failures visible**
Add a `ghl_tag_last_error` text column, written by the sweep when a push or verification fails. Surface a small amber "GHL tag pending" indicator on approved rows in the Review Queue so a stuck tag is visible in the portal instead of only in GHL.

## On the GHL side

Your Wait step should not wait on `approved` alone. Change it to continue on **any** of: `approved`, `appointment-declined`, or `appointment-oon`, then branch — confirmation messaging on `approved`, cancellation messaging on `appointment-declined`, and OON handling on `appointment-oon`. Add a max-wait (e.g. 7 days) as a safety valve so nothing can park indefinitely again.

## Technical notes

- Files: `supabase/functions/retry-missing-ghl-approved-tags/index.ts`, `src/components/admin/ReviewQueue.tsx`, one migration for `ghl_tag_last_error`.
- Existing hourly pg_cron job (`retry-missing-ghl-approved-tags-hourly`, `7 * * * *`) stays as-is; only the function's filtering changes.
- No appointment statuses, dates, review decisions, or parsed intake data are touched.
