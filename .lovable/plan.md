## Problem

Premier Vascular lead `DONOTCONTACT2 TESTLEAD2` (id `b476b619…`) has `Time Preference: Morning` in GHL but the row stored `time_preference = 'no_preference'`.

## Root cause

In `supabase/functions/ghl-webhook-handler/index.ts`:

- Line 647 — on **INSERT**, `time_preference` is extracted from `webhookData.patient_intake_notes`, the raw webhook payload. That payload does not yet contain the "Time Preference" custom-field line, so `extractTimePreference()` returns null and the value defaults to `'no_preference'`.
- Lines 1180-1311 — the function then fetches the **full GHL contact** (including the `Time Preference` custom field), appends it to `patient_intake_notes` as `=== GHL Contact Data (Full) ===`, but **never re-extracts or updates the `time_preference` column**.

So the column is permanently stuck on the initial fallback even when GHL clearly has a value.

## Fix

In the GHL contact enrichment block of `ghl-webhook-handler/index.ts` (around line 1251 where `customFields` are iterated for Premier Vascular):

1. While walking `customFields`, look for a field whose key matches `/time\s*preference|preferred\s*time|best\s*time/i`.
2. Normalize its value with the same logic as `extractTimePreference()` (morning / afternoon / evening / no_preference).
3. When the existing appointment is Premier Vascular, include `time_preference` in the post-enrichment `update` call alongside `patient_intake_notes` — but only when a valid value was extracted (don't clobber an existing real preference with null).

### Backfill the affected row

Run a one-off update for `b476b619-eb61-4db8-bd3e-7a3f1733f53a` to set `time_preference = 'morning'` (also re-run for any other Premier Vascular leads where notes contain "Time Preference: Morning|Afternoon|Evening" but column is `no_preference`). Done via migration.

## Files

- `supabase/functions/ghl-webhook-handler/index.ts` — add custom-field-based time_preference re-extraction in the enrichment block.
- New migration — backfill existing mis-stored Premier Vascular `time_preference` rows from their `patient_intake_notes`.

## Out of scope

- `fetch-ghl-contact-data` already handles this correctly (line 334-346); no change needed there.
- No UI / frontend changes.
