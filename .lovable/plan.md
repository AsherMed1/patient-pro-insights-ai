## Problem

Dorothy Martinez, Corey Ransom, and Ingrid Rivera-Rodriguez (Everest Vascular) were Approved in the Review Queue but the `approved` tag never reached GHL, so they're stuck in a wait step of the GHL workflow.

Confirmed via investigation:
- All 3 rows have `review_status = 'approved'` and a valid `ghl_id`.
- `appointment_review_history` shows manual admin approvals (kim.a, staecy.p, Lucas Gianoli) on Jun 18–21.
- `update-ghl-contact-tags` works correctly when invoked with the Everest project key (tested live → 200 OK).
- The current ReviewQueue code (`src/components/admin/ReviewQueue.tsx` lines 598–640) invokes the function but treats failures as fire-and-forget — only a toast appears. If the admin's tab was closed, the network hiccupped, or the toast was dismissed, the row stays approved in our DB while GHL never gets tagged. No persistent retry, no audit trail of tag delivery.

## Fix

### 1. Immediate backfill for the 3 named patients
Invoke `update-ghl-contact-tags` once each for:
- Corey Ransom — `ghl_id: RAZv3nCvjTKcgiIz6bOI`
- Dorothy Martinez — `ghl_id: aWv391Csf4PHJIMl50tS`
- Ingrid Rivera-Rodriguez — `ghl_id: yrsG4gcvfZVqSAe8xrbe`

Using Everest Vascular's `ghl_api_key` from `projects`. This unblocks the GHL wait step immediately.

### 2. Track tag delivery on the appointment row
Add column `all_appointments.ghl_approved_tag_sent_at timestamptz` (nullable).
- Set when `update-ghl-contact-tags` returns success from ReviewQueue approve and from the ghl-webhook-handler Setter-Submitted auto-approve.
- Leave NULL when the call fails or is skipped (no ghl_id, exempt project, etc.).

### 3. Backfill scan + auto-retry edge function
New edge function `retry-missing-ghl-approved-tags`:
- Selects `all_appointments` where `review_status = 'approved'` AND `ghl_id IS NOT NULL` AND `ghl_approved_tag_sent_at IS NULL` AND `project_name` NOT IN the exempt set (ECCO, Premier Vascular, Premier Vascular Surgery, Davis Vein & Vascular).
- For each, looks up the project's `ghl_api_key` and calls `update-ghl-contact-tags`.
- On success, stamps `ghl_approved_tag_sent_at = now()`.
- Batched (50/run) with `EdgeRuntime.waitUntil` for long runs.
- Run it once after deploy to clean up any other silently-stuck appointments across all projects, then keep it available for manual re-runs.

### 4. Harden ReviewQueue approve path
In `src/components/admin/ReviewQueue.tsx` (the existing tag-invoke block):
- On success → update the row with `ghl_approved_tag_sent_at = now()`.
- On failure → keep the existing destructive toast AND leave `ghl_approved_tag_sent_at` NULL so the retry function picks it up on the next sweep.
- Add the same stamping logic to the `ghl-webhook-handler` Setter-Submitted auto-approve branch.

### Out of scope
- No change to OON / Declined / Dismissed flows.
- No change to exempt-project behavior (still no tag, no Slack).
- No UI surface for the new timestamp (admin-internal only).

## Technical details

**Files**
- New migration: add `ghl_approved_tag_sent_at` to `all_appointments`.
- New edge function: `supabase/functions/retry-missing-ghl-approved-tags/index.ts` (service-role client, batches, calls existing `update-ghl-contact-tags`).
- Edit: `src/components/admin/ReviewQueue.tsx` (stamp timestamp after successful tag call).
- Edit: `supabase/functions/ghl-webhook-handler/index.ts` (stamp timestamp on Setter-Submitted auto-approve tag success).

**Backfill execution**
- Step 1 (the 3 named patients) runs immediately via `supabase--curl_edge_functions` after deploy — no UI needed.
- Step 3 sweep also runs once via curl after deploy to catch any other stuck rows.
