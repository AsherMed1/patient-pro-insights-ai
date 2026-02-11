

# Plan: Route Generic "Notes" Field in fetch-ghl-contact-data

## Problem
The `fetch-ghl-contact-data` edge function has the same gap we just fixed in the webhook handler and auto-parser. On line 229, any GHL custom field that doesn't match a known category keyword is silently dropped. A field like "Notes (Example: Imaging, Secondary, Etc.)" doesn't contain keywords like "insurance", "pain", "medication", etc., so it gets skipped entirely.

This is why the "Naadi TEST ONLY" appointment in Naadi Healthcare Manteca is missing the Notes data -- it was never written into `patient_intake_notes` in the first place.

## Fix

### File: `supabase/functions/fetch-ghl-contact-data/index.ts`

**In `formatCustomFieldsToText`** (around lines 226-229), add the same generic "notes" routing before the skip-all-else comment:

```typescript
} else if (key.includes('phone') || key.includes('email') || ...) {
  sections['Contact Information'].push(formattedLine);
} else if ((key === 'notes' || key.startsWith('notes ') || key.startsWith('notes_') || key.startsWith('notes(')) &&
           !key.includes('conversation')) {
  sections['Insurance Information'].push(formattedLine);
}
// Skip all other fields ...
```

This matches the same pattern we already deployed in the webhook handler and auto-parser.

### Deployment and Verification

After updating the function, deploy it and then re-fetch the GHL data for "Naadi TEST ONLY" to verify the Notes field appears in the portal.

## Technical Details

- Only one file changes: `supabase/functions/fetch-ghl-contact-data/index.ts`
- The change adds 3 lines before the existing skip comment on line 229
- Consistent with the pattern already applied in `ghl-webhook-handler` and `auto-parse-intake-notes`
- After deployment, a manual re-fetch of GHL data for the test appointment will confirm the fix

