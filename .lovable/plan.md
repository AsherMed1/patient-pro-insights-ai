## What I found

The `update-ghl-contact-tags` edge function has **zero invocation logs** — it was never actually called when you approved the appointment. Two likely causes:

1. **The function isn't registered in `supabase/config.toml`.** Every other edge function in this project has an explicit `[functions.<name>]` block with `verify_jwt = false`. `update-ghl-contact-tags` is missing, so the deployed function may be rejecting the request before any code runs (no logs are produced for pre-auth rejections).
2. **The appointment row had no `ghl_id`.** The `ReviewQueue` approve handler only fires the tag call when `priorRow?.ghl_id` is truthy. If the appointment was created without a GHL contact ID (some legacy/manually-created rows), the side effect is silently skipped.

## Plan

1. **Register the function** in `supabase/config.toml`:
   ```
   [functions.update-ghl-contact-tags]
   verify_jwt = false
   ```
2. **Make the silent skip visible** in `src/components/admin/ReviewQueue.tsx`: when `action === 'approved'` and `priorRow.ghl_id` is missing, show a warning toast ("Approved — no GHL contact linked, tag not added") instead of doing nothing. This way future failures are obvious.
3. **Add a log line in the edge function** confirming receipt + the contact ID, so we can see invocations in logs going forward.
4. **Backfill the missed appointment(s)**: tell me which patient/appointment you just approved (or I can query the most recent `appointment_review_history` rows with `action='approved'`), check whether `ghl_id` exists, and if so call `update-ghl-contact-tags` directly to add the `approved` tag retroactively.

## Question

Do you know the patient name / approval time of the one that didn't get tagged? If not, I'll pull the most recent approvals and check each one's `ghl_id` after switching to build mode.
