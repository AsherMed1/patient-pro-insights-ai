# Fix: Insurance details not syncing from GHL to Portal

## What happened for Obery Hendricks (ghl_id `vKR90UAux1DW7CcqmBxE`)

GHL sent complete insurance data in the intake notes:

- `Please select your insurance provider: Other`
- `Insurance Plan: United Healthcare`
- `Insurance Group Number: 712790`
- `Insurance ID Number: 956825123`
- `Upload A Copy Of Your Insurance Card (Primary): {...two documents/download URLs...}`

But `all_appointments.parsed_insurance_info` for this row is all nulls, and `insurance_id_link` / `insurance_back_link` are null — so the portal shows an empty Insurance Information card and no card image, even though the notes contain everything.

Root cause: the AI parser in `auto-parse-intake-notes` is treating `Please select your insurance provider: Other` as "no provider" and then not falling back to the `Insurance Plan` line, which is where GHL actually stores the real carrier when the picker is set to "Other". It also isn't extracting the card upload URLs from the `Upload A Copy Of Your Insurance Card (Primary)` JSON blob into `insurance_id_link` / `insurance_back_link`.

## Fix

### 1. `supabase/functions/auto-parse-intake-notes/index.ts`

- **Provider fallback:** when `Please select your insurance provider` is empty / `Other` / `None`, use `Insurance Plan` (or `Insurance Provider` if present) as `insurance_provider`. Keep the original `Insurance Plan` value in `insurance_plan`.
- **Insurance ID:** already extracted, but confirm it survives when provider is "Other".
- **Card upload URL extraction (deterministic, before/after AI):** parse the `Upload A Copy Of Your Insurance Card (Primary): { ... }` JSON blob in the notes. Collect the `url` values from each document object in document-order. Map the first URL to `insurance_id_link` (front) and the second, if any, to `insurance_back_link`. Only set columns that are currently NULL — never overwrite a portal-uploaded image.
- Do the same for the secondary card field if present (`Upload A Copy Of Your Insurance Card (Secondary)` or the equivalent GHL label), writing into `parsed_insurance_info.secondary_card_front_url` / `secondary_card_back_url`.

### 2. `supabase/functions/ghl-webhook-handler/index.ts`

Same URL-extraction helper on the write path so brand-new webhook rows land with `insurance_id_link` / `insurance_back_link` populated instead of waiting on the LLM. Behind the same "don't overwrite non-null" guard.

### 3. One-off repair for Obery Hendricks

After deploy, invoke `reparse-specific-appointments` for `f0def3bf-fd46-4000-a187-b3e3372403d9` so his row backfills without waiting for another GHL event.

### 4. Backfill sweep (optional but recommended)

Query `all_appointments` where `patient_intake_notes ILIKE '%Upload A Copy Of Your Insurance Card%'` AND `insurance_id_link IS NULL`, then re-invoke `reparse-specific-appointments` for those IDs in batches. This catches any other Liberty Joint & Vascular (and other project) rows that hit the same "Other" + card-upload gap.

## Out of scope

- No UI changes — the Insurance Information card already renders `parsed_insurance_info` + `insurance_id_link` / `insurance_back_link` correctly once they're populated.
- No changes to portal-side edit/upload flow.
- No changes to the review-queue gating.
