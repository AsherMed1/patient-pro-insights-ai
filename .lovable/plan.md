
# Fix PAD Survey Fields Not Populating

## Root Cause

PAD survey fields from GHL are being silently dropped before they ever reach the database. Both `fetch-ghl-contact-data` and `ghl-webhook-handler` categorize GHL custom fields into sections (Contact, Insurance, Pathology, Medical) using keyword matching. PAD-specific keywords like "smoke", "tobacco", "blood thinner", "vascular provider", "open wounds", "numbness", "walking", and "circulation" don't match any routing keyword, so these fields are completely discarded and never written to `patient_intake_notes`.

Since `auto-parse-intake-notes` reads from `patient_intake_notes`, it never sees these fields and cannot extract them.

## The Fix

Route all "STEP" fields to the Pathology section. Every GHL survey field follows the naming pattern "PAD Step X | ..." (or "UFE STEP X | ...", etc.), so checking for "step" in the key name is a reliable catch-all for survey/pathology data.

## Changes

### 1. Update `supabase/functions/fetch-ghl-contact-data/index.ts`

In the `formatCustomFieldsToText` function (around line 220), add `key.includes('step')` to the Pathology routing check:

```
Before (line 222):
} else if (key.includes('pain') || key.includes('symptom') || key.includes('condition') || ...)

After:
} else if (key.includes('step') || key.includes('pain') || key.includes('symptom') || key.includes('condition') || ...)
```

This ensures all "PAD Step 1 | ...", "PAD Step 2 | ..." fields land in the Pathology Information section.

### 2. Update `supabase/functions/ghl-webhook-handler/index.ts`

Same fix in two places where field categorization occurs:

**First location** (around line 472, the `formatCustomFieldsToNotes` helper):
Add `key.includes('step')` to the pathology routing.

**Second location** (around line 1021, the full enrichment categorization):
Add `key.includes('step')` to the pathology routing.

### 3. Deploy Both Edge Functions

Deploy `fetch-ghl-contact-data` and `ghl-webhook-handler`, then reparse the DONOTCONTACT TESTLEAD PAD appointment to verify all survey fields populate.

## Expected Result

After the fix and reparse, the PAD appointment's `patient_intake_notes` will contain all survey fields:
- Open Wounds: Yes
- Pain To The Toes: Yes
- Vascular Provider: Yes
- Medical Conditions: Diabetes, Hypertension, Kidney disease, Heart attack, Stroke, Previous amputation
- Smoking: Current
- Age Range: less than 50 years
- Numbness/Cold Feet: Yes
- Worse When Walking: Yes
- PAD/Poor Circulation: Yes
- Blood Thinners: Yes

The existing `auto-parse-intake-notes` extraction logic (already updated with PAD field matchers) will then correctly populate `parsed_pathology_info` and `parsed_medical_info` for display in the Medical Information card.
