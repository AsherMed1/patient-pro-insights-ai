## Root cause

The ControlHub link stored on `qa_cases.controlhub_ticket_url` (e.g. `https://ppmcontrolhub.lovable.app/?ticket=<id>&type=tech`) fails because of two problems on the ControlHub side, verified by cross-project reads:

1. **The row has no `user_id`.** PatientPro's `create-controlhub-ticket` calls ControlHub's `receive-external-ticket`, which inserts into `tech_ticket_submissions` with `source: "patientpro"` but never sets `user_id`. Every RLS SELECT policy on that table requires either `has_role(auth.uid(),'admin')`, `has_role(auth.uid(),'moderator')`, `auth.uid() = user_id`, or `auth.uid() = assigned_to`. A non-admin QA opening the link matches none of them, so `UserSubmissionDetailDialog.fetchTicket()` gets an empty response and renders exactly the message in the screenshot: *"Couldn't load this ticket. It may have been removed or you no longer have access."*
2. **The deep link points at `/`, not `/admin`.** The `Index` page dispatches `open-ticket-detail`, but only components that happen to be mounted on `/` (mainly `FeatureGrid`) listen for it. For admin/moderator viewers the ticket dialog is wired up on `/admin`. So even admins occasionally see nothing happen from a `/?ticket=…` link.

Evidence: `PPM ControlHub/supabase/functions/receive-external-ticket/index.ts:53-64` (no `user_id` on insert), `PPM ControlHub/supabase/migrations/…tech_ticket_submissions` RLS policies, `PPM ControlHub/src/components/UserSubmissionDetailDialog.tsx:236-242` (empty result → that exact error string), and `qa_cases.controlhub_ticket_url` rows queried in this project.

## Fix — two coordinated changes

### A. ControlHub project (`PPM ControlHub`)

1. **`supabase/functions/receive-external-ticket/index.ts`** — after inserting, look up a profile whose email matches `submitted_by` (case-insensitive). If found, update the new row's `user_id` so the "Users can view own tech tickets" policy admits them. If no match, leave `user_id` null and rely on admin/moderator visibility. Also accept an optional `submitted_by_email` field in the payload (Zod schema) so PatientPro can pass the real email even when the display name is different.
2. **Migration**: add an RLS policy `"External patientpro tickets viewable by authenticated"` on `tech_ticket_submissions` that permits SELECT when `source = 'patientpro'` for any authenticated user — scoped narrowly to externally-created tickets so it doesn't loosen anything else. (This makes the QA/setter/agent who filed the ticket able to open it even if their ControlHub profile email doesn't match.)
3. **`ticket_url` fix**: change the returned URL from `${publicOrigin}/?ticket=…` to `${publicOrigin}/admin?ticket=…&type=tech`. `AdminDashboard.tsx` already handles that deep link via its `useEffect` on `searchParams`.

### B. PatientPro project (this repo)

1. **`supabase/functions/create-controlhub-ticket/index.ts`** — forward the QA's real email as `submitted_by_email` in the outbound POST. Source it from `auth.uid()` → `profiles.email` when the caller is authenticated (the function is called from the browser, so `Authorization: Bearer <jwt>` is present). Fall back to the existing `submitted_by` string only.
2. No UI changes; the `<a href={caseData.controlhub_ticket_url}>` in `QAOperationsQueue.tsx` will start working automatically because the stored URL will already point to `/admin?ticket=…`.

### Backfill

One-time SQL over `qa_cases`: rewrite existing `controlhub_ticket_url` values from `…/?ticket=<id>&type=tech` to `…/admin?ticket=<id>&type=tech` so the three tickets already created (verified via `read_query`) become clickable too.

## Out of scope

- No changes to the QA queue UI, ticket dialog, or Slack/email templates.
- Not touching VA/system/calendar ticket flows; only the tech path used by PatientPro.
