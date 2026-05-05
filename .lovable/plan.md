# Fix: Patient Pro Insights not auto-populating from GHL custom fields

## Root cause (confirmed via edge logs)

The Premier Vascular GHL workflow webhook is sending the literal string `"null"` for nearly every clinical field:

```json
"customFields": {
  "insurance_provider": "null",
  "insurance_member_id": "null",
  "insurance_id_link": "null",
  "primary_complaint": "null",
  "symptoms": "null",
  "address": "17856 W Summerhaven Dr",
  "city": "Goodyear",
  ...
}
```

Our handler correctly drops `"null"` strings (line 472 filter), so only `address/city/state/zip` survive — that's why the saved record shows only a Contact section. The clinical fields (Pathology, Insurance, Medical, Demographics) are blank because the webhook never delivered them.

The actual values **do exist on the GHL contact** — they're just not being included in the workflow's webhook payload mapping. We can fetch them ourselves via the GHL Contacts API right after the row is created.

A second, smaller bug: `date_of_birth` arrived as `"Feb 16th 1943"`-style strings for other contacts. For the Premier test it apparently produced `2026-05-01` (future date → age 0). `normalizeDob` doesn't handle the "Mon Nth YYYY" format and has no future-date guard.

## Plan

### 1. Auto-enrich after insert (`ghl-webhook-handler/index.ts`)

After a new appointment row is inserted (and right after we kick off `auto-parse-intake-notes`), if `ghl_id` is present and patient_intake_notes is empty/Contact-only, fire a non-blocking call to the existing `fetch-ghl-contact-data` edge function:

```ts
EdgeRuntime.waitUntil(
  supabase.functions.invoke('fetch-ghl-contact-data', {
    body: { appointmentId: newRow.id }
  })
)
```

`fetch-ghl-contact-data` already:
- Looks up the project's GHL API key + location
- Pulls the full contact with custom field **definitions** (mapping field IDs → human names)
- Categorizes fields into Contact / Insurance / Pathology / Medical sections
- Appends formatted text to `patient_intake_notes`

That update will then re-trigger `trigger_auto_ai_parsing` (clears `parsing_completed_at`, etc.), which fires `auto-parse-intake-notes` and produces the structured `parsed_pathology_info` / `parsed_insurance_info` / `parsed_demographics` JSON the UI reads.

### 2. Sanitize "null" strings deeper

In `formatCustomFieldsToNotes` (and the workflow extractor), also reject `'null'`, `'undefined'`, `'n/a'`, `'none'`, `''` (case-insensitive, trimmed) as values — not just at the top-level filter. This prevents `"insurance_provider: null"` from ever leaking into notes if the field arrives via a different path.

### 3. Fix DOB normalization (`normalizeDob`)

- Add support for `"Feb 16th 1943"` / `"May 13th 1958"` style strings (strip `st|nd|rd|th`, then `Date.parse`).
- Reject any parsed date in the future → return `null` instead.
- Apply the same future-date guard wherever `dob` is written so we never store `2026-05-01` and compute age = 0.

### 4. Backfill the existing Premier test row

For appointment `9806c839-6d0b-4518-97b8-595d721e59c7` (DONOTCONTACT TESTLEAD, ghl_id `j4WFc81DrwZCrEUU2feL`):
- Null out the bogus `dob = 2026-05-01` and the derived `parsed_demographics.age = 0`.
- Invoke `fetch-ghl-contact-data` once for that appointment so the UI immediately shows whatever custom-field data actually lives on the GHL contact.

### 5. Verification

After deploy:
- Confirm the Premier test row's `patient_intake_notes` gets populated with Insurance/Pathology/Medical sections (assuming GHL has those values on the contact).
- Confirm `parsed_pathology_info` and `parsed_insurance_info` get filled by the auto-parser within ~30s.
- Confirm DOB no longer renders as `2026-05-01` / age 0.
- Re-fire the GHL workflow → new row should auto-enrich without manual action.

## Out of scope
- Changing the GHL workflow itself (that's a config fix on the user's side — recommend it, but we'll work around it in code).
- Schema changes.

Approve to implement.
