

## Fix: GHL "Notes" Custom Field Not Captured in Portal

### Problem
The GHL custom field **"Notes (Example: Imaging, Secondary, Etc.) - Optional"** is being silently dropped during the GHL-to-portal sync. The field categorization logic in `ghl-webhook-handler/index.ts` (lines 1050-1070) checks for specific keywords like `insurance`, `step`, `pain`, `medication`, `phone`, etc. — but has no rule that matches a generic "notes" field. Since this field doesn't match any category, it is never included in `patient_intake_notes`, so the AI parser never sees it, and it never reaches `parsed_insurance_info.insurance_notes`.

The AI parser prompt (in `auto-parse-intake-notes`) already instructs: *"Always extract any generic 'Notes' field value here"* into `insurance_notes`. The problem is upstream — the data never makes it into the intake notes text.

### Change

| File | Change |
|------|--------|
| `supabase/functions/ghl-webhook-handler/index.ts` | Add a catch-all `else` clause to the field categorization logic that places unmatched fields (like "Notes") into an "Additional Information" section, so no custom field data is silently dropped. Also add an explicit `notes` keyword match to route it to Insurance Information (where the parser expects it). |

### Technical Detail

In `ghl-webhook-handler/index.ts` around line 1025, add an "Additional Information" section to the sections object, and around line 1070, add:

```typescript
// Add explicit "notes" keyword match
} else if (key.includes('notes') || key.includes('note')) {
  sections['Insurance Information'].push(formattedLine)
// Catch-all for unmatched fields
} else {
  sections['Additional Information'].push(formattedLine)
}
```

This ensures the "TEST" note (and any other uncategorized GHL fields) flows into the intake notes, gets parsed by AI, and appears in the portal under the Insurance card's "Notes" line.

After deploying, a re-parse of the BVC TEST ONLY record will pick up the note.

