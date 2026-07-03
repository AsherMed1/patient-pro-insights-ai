# Handle existing HEIC insurance cards

## Problem
The previous fix only prevents new HEIC uploads. Cards already stored as `.heic` (e.g. Donna Zarn's) still render broken and auto-download when "Full Size" / thumbnail is clicked, because the browser can't decode HEIC and Supabase Storage serves them with `Content-Disposition: attachment`.

## Fix — two parts

### 1. On-the-fly conversion in the viewer (immediate relief, covers every existing record)

In `src/components/InsuranceViewModal.tsx` (and the small `<img>` preview inside `InsuranceCardUpload.tsx` / `SecondaryInsuranceCardUpload.tsx`):

- Detect any URL ending in `.heic` / `.heif`.
- When detected, fetch the file, convert with `heic2any` in the browser, create an object URL, and use that both for the `<img src>` preview and for the "Full Size" / thumbnail click (open the blob URL in a new tab so it renders inline).
- Show a small "Converting…" state while the conversion runs; cache the converted blob URL per-URL so re-opens are instant.
- On conversion failure, fall back to the original URL with a tooltip explaining the file is a HEIC that can't be previewed.

This means Donna Zarn's card starts working immediately with no data migration.

### 2. One-time backfill utility (optional, permanent cleanup)

Add `src/utils/convertHeicInsuranceCards.ts` — an admin-run browser utility that:

1. Queries `all_appointments` for rows where `insurance_id_link` or `insurance_back_link` ends in `.heic`/`.heif`.
2. For each URL: downloads the file, converts to JPEG via `heic2any`, uploads the JPEG to the same `insurance-cards` bucket under a sibling path (`…/front_<ts>.jpg`), then updates the appointment row via `update-appointment-fields` so history/audit is preserved.
3. Logs successes/failures and skips anything that fails, so partial runs are safe to re-run.

Runs on-demand from the browser console (same pattern as the other `src/utils/update*` scripts). No edge function needed since `heic2any` is browser-only and server-side HEIC decoding in Deno is fragile.

## Files touched
- `src/components/InsuranceViewModal.tsx` — HEIC-aware image + open handlers
- `src/components/appointments/InsuranceCardUpload.tsx` — HEIC-aware preview thumbnail
- `src/components/appointments/SecondaryInsuranceCardUpload.tsx` — same
- `src/utils/convertHeicInsuranceCards.ts` — new backfill utility

## Out of scope
- Changing storage bucket MIME configuration (won't help; the file bytes are still HEIC).
- Server-side conversion — unnecessary and adds a fragile Deno dependency.
