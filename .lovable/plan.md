

# Fix: Insurance Card URL Showing in Medical Information Notes

## Problem

The "Notes" field in the Medical Information card is displaying raw insurance card upload URLs like:
"Upload A Copy Of Your Insurance Card: https://services.leadconnectorhq.com/documents/download/..."

This happens because the GHL "Notes" custom field sometimes contains both the patient's actual notes and the insurance card upload prompt/URL. The parser captures the entire value as `insurance_notes`, and the UI displays it as-is.

## Fix

**File: `src/components/appointments/ParsedIntakeInfo.tsx`**

Clean the `insurance_notes` value before displaying it by stripping out any "Upload A Copy Of Your Insurance Card: [URL]" text. If the entire note is just the upload prompt, hide the Notes field entirely.

Add a small helper that:
1. Removes text matching patterns like "Upload A Copy Of Your Insurance Card: https://..." from the notes string
2. Trims the result
3. Returns null/empty if nothing meaningful remains

This is a display-only fix -- the raw data in the database stays intact, and the insurance card URL is already extracted and shown separately via the "View Insurance Card" button.

## Technical Detail

Before the Notes display block (around line 814), sanitize the value:

```typescript
const cleanedInsuranceNotes = (() => {
  const raw = parsedInsuranceInfo?.insurance_notes;
  if (!raw) return null;
  const cleaned = raw
    .replace(/Upload\s+A\s+Copy\s+Of\s+Your\s+Insurance\s+Card:\s*https?:\/\/\S+/gi, '')
    .replace(/https?:\/\/services\.leadconnectorhq\.com\/documents\/download\/\S+/gi, '')
    .trim();
  return cleaned || null;
})();
```

Then use `cleanedInsuranceNotes` instead of `parsedInsuranceInfo?.insurance_notes` in both the condition check and the rendered output.
