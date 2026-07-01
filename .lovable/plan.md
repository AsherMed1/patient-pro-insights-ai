## Problem

Self-booked (patient-submitted) appointments for Premier Vascular and other "preferred time" clinics (ECCO Medical, Premier Vascular Surgery, Davis Vein & Vascular) are auto-approved and bypass the Review Queue entirely, so they become client-facing without verification.

Currently these four projects are hard-coded as `REVIEW_QUEUE_EXEMPT` in the intake pipeline, which forces `review_status = 'approved'` regardless of who booked the appointment.

## Fix

Treat these clinics like every other clinic: gate visibility on the GHL "Insurance Intake Source" custom field.

- `Setter Submitted` → auto-approved (bypass Review Queue), no Slack alert. Unchanged.
- `Patient Submitted` or unset → `review_status = 'pending'`, appears in Review Queue, fires Slack review-queue alert.

## Changes

1. **`supabase/functions/ghl-webhook-handler/index.ts`** (lines ~206-238)
   - Remove the `REVIEW_QUEUE_EXEMPT` shortcut for setting `review_status`.
   - Keep the existing intake-source resolution (webhook field, then contact fallback).
   - `reviewStatus = isSetterSubmitted ? 'approved' : 'pending'` for all projects.

2. **`supabase/functions/all-appointments-api/index.ts`**
   - Line 225: stop forcing `review_status: 'approved'` for the four projects — default all new rows to `'pending'`.
   - Lines 307-308: remove these four projects from `REVIEW_QUEUE_EXEMPT` so the Slack review-queue notification fires for them too.

3. **`supabase/functions/import-missing-leads-from-ghl/index.ts`** (backfill importer)
   - Remove Premier/ECCO/Davis/Premier Vascular Surgery from `REVIEW_QUEUE_EXEMPT` so re-imports also land in Review Queue (unless setter_submitted, if that logic exists there — otherwise all default to pending).

4. **Memory update** — `mem://index.md` Core rule for Review Queue Gate: drop "ECCO Medical, Premier Vascular, Premier Vascular Surgery, and Davis Vein & Vascular are exempt" and replace with a note that ALL projects follow the Insurance Intake Source rule. Update or remove `mem://features/admin-review-queue/exempt-projects`.

5. **No schema or UI changes.** Existing already-approved historical rows are left alone (only new intakes are affected). If the user wants existing auto-approved Premier rows retroactively moved back to pending for re-review, that's a separate one-shot SQL and I'll ask before running it.

## Verification

- Deploy the two edge functions.
- Confirm in Supabase that a new Premier Vascular webhook without `insurance_intake_source = setter_submitted` inserts with `review_status = 'pending'` and shows up in the admin Review Queue.
- Confirm a setter-submitted Premier lead still auto-approves and skips Slack.
