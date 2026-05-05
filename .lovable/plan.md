## Problem

For Premier Vascular leads, `time_preference` is set at webhook insert time from the initial (sparse) intake notes — usually defaulting to `no_preference`. The richer custom-field data (`Time Preference: Morning`) only arrives later via `fetch-ghl-contact-data`, but that function never updates the `time_preference` column.

Result: test lead `9806c839…` shows `time_preference = no_preference` while its enriched notes clearly say `Time Preference: Morning`.

## Fix

### 1. `supabase/functions/fetch-ghl-contact-data/index.ts`
- Add a small `extractTimePreference(notes)` helper (same logic as in webhook handler — match `Time Preference:` / `Preferred Time:` / `Best time to call:` then keywords morning/afternoon/evening/no_preference).
- Also accept the raw GHL custom-field value directly (look for a field whose name matches `/time\s*preference|preferred\s*time|best\s*time/i`) before falling back to notes regex.
- When the appointment's `project_name` is Premier Vascular (and `is_unscheduled` is true), include `time_preference` in the `.update({…})` call only if a non-null value is extracted (don't overwrite an existing meaningful value with null).

### 2. `supabase/functions/ghl-webhook-handler/index.ts`
- Tighten `extractTimePreference`: when the initial notes don't actually contain a recognizable preference, return `null` instead of letting the caller default to `'no_preference'`. Keep the `|| 'no_preference'` fallback at insert time so the column is never null on create, but ensure the auto-enrichment path can later overwrite a `no_preference` placeholder with the real value (treat `no_preference` as "unset" for the purpose of the enrichment update).

### 3. Backfill (DB migration / one-off update)
For the existing Premier test lead `9806c839-6d0b-4518-97b8-595d721e59c7`:
- `UPDATE all_appointments SET time_preference = 'morning' WHERE id = '9806c839-6d0b-4518-97b8-595d721e59c7' AND time_preference IN ('no_preference', NULL);`

## Files
- `supabase/functions/fetch-ghl-contact-data/index.ts` — extract + update `time_preference`
- `supabase/functions/ghl-webhook-handler/index.ts` — allow enrichment to overwrite the `no_preference` placeholder
- New migration to backfill the test lead

Approve to implement?
