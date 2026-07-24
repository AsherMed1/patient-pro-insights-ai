## What's happening

Rana Asif's Patient Intake Notes clearly contain:
- `Please select your insurance provider: Aetna`
- `Insurance ID Number: 233102178702`
- `Insurance Plan: Aetna`
- `Notes: Mostly feet for a year, haven't tried any treatments`

But `all_appointments.parsed_insurance_info` is `{ insurance_provider: null, insurance_plan: null, insurance_id_number: null, insurance_group_number: null, insurance_notes: null }` and `detected_insurance_provider` / `detected_insurance_id` are NULL.

DOB is populated for Rana — the webhook writes it directly from `contact.dateOfBirth`. Insurance isn't populated because the webhook delegates **all** insurance extraction to `auto-parse-intake-notes`, and if that AI call misses the fields (transient 429, malformed JSON, or the AI simply returning nulls for a Neuropathy intake) the enrichment regex only runs inside that same edge function — so the appointment gets stamped "parsed" with an empty insurance block and never re-tries.

The same fragility applies to every new lead: DOB has a webhook-side safety net, insurance does not.

## Fix

Extract insurance from GHL custom fields **inside the webhook enrichment step** (same place we already write `parsed_contact_info` and `parsed_demographics`), so critical insurance data is guaranteed the moment the contact is fetched — before auto-parse even runs. Auto-parse continues to run on top and can only enrich (never blank) these fields.

### Changes

1. **`supabase/functions/ghl-webhook-handler/index.ts`** — in the `fetchAndEnrichContactData` path (around lines 1990-2095):
   - Add a helper that walks `customFields` and pulls:
     - Provider: keys matching `insurance provider` / `please select your insurance provider`
     - Plan: `insurance plan` (excluding `(2)` secondary)
     - ID: `insurance id number` / `member id` / `subscriber id`
     - Group: `insurance group number` / `group number`
     - Notes: `notes (example:` (insurance-adjacent free-text)
   - Normalize (`Other` / `None` / `N/A` → null; trim; length cap).
   - Merge into `enrichmentUpdate` alongside `parsed_contact_info`:
     - `parsed_insurance_info: { ...(existing), ...(non-null extracted) }` (read existing first, non-null merge — same pattern DOB uses).
     - `detected_insurance_provider`, `detected_insurance_plan`, `detected_insurance_id`, `detected_insurance_group_number` when the corresponding value is present.
     - `insurance_id_link` from `extractInsuranceCardUrl(customFields)` if not already set.

2. **`supabase/functions/auto-parse-intake-notes/index.ts`** — small hardening so the auto-parser can no longer clobber the webhook-written values:
   - In the write step at lines 3096-3099, change `updateData.parsed_insurance_info = parsedData.insurance_info` to a non-null merge over the existing row's `parsed_insurance_info` (fetch alongside the other `existing*` reads at 3065-3067). Same non-null merge treatment for `parsed_medical_info`. This mirrors how demographics/contact are already handled.

3. **Backfill Rana Asif** (`ea90030f-0561-46a4-b9c3-348612be4d41`) via a data update:
   - `parsed_insurance_info` → `{ insurance_provider: "Aetna", insurance_plan: "Aetna", insurance_id_number: "233102178702", insurance_notes: "Mostly feet for a year, haven't tried any treatments" }`
   - `detected_insurance_provider = "Aetna"`, `detected_insurance_plan = "Aetna"`, `detected_insurance_id = "233102178702"`.

### Out of scope

- No schema changes; no UI changes (the portal already reads `parsed_insurance_info` and `detected_insurance_*`).
- Historical records other than Rana are not backfilled in this change; a broader sweep can follow once you confirm the fix works on the next few incoming leads.

### Why this is safe

- Only writes non-null values. If GHL doesn't send a field, the row is untouched.
- Auto-parse runs after the webhook write and now merges instead of replacing, so an AI miss on a subsequent re-parse can never blank a field the webhook already populated.
- Uses the same GHL custom-field structure the notes formatter already walks — no new external calls.
