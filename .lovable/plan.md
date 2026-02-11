

# Plan: Route GHL "Notes" Field to Insurance Notes in the Portal

## Problem
Alliance Vascular has a GHL custom field labeled "Notes (Example: Imaging, Secondary, Etc.) - Optional" that contains free-text clinical notes (e.g., "Both feet and hands, tried all kinds of treatment"). This data is not showing up in the portal because:

1. In the **webhook handler**, the field key (just "notes" without "insurance" or other keywords) doesn't match any routing category, so it gets dumped into the generic "contact" section where it's buried.
2. In the **auto-parser**, the GHL field extractor only matches `insurance_notes` when the key contains BOTH "insurance" AND "note". A field key like "notes" alone doesn't match.

The portal displays `insurance_notes` in the Medical Information card with an amber background, which is the correct destination for this data.

## Changes

### 1. Edge Function: `supabase/functions/auto-parse-intake-notes/index.ts`

**In `extractDataFromGHLFields` function** -- Add a catch for generic "notes" fields that should route to `insurance_notes`:

- After the existing insurance note check (`key.includes('insurance') && key.includes('note')`) around line 668, add a fallback condition:
  - If the key is exactly "notes" or matches patterns like "notes (example" or "notes_optional", and `insurance_notes` is still null, set `result.insurance_info.insurance_notes = value`
- This ensures the generic "Notes" field from Alliance Vascular (and any similar project) gets captured

### 2. Edge Function: `supabase/functions/ghl-webhook-handler/index.ts`

**In `formatCustomFieldsToNotes` function** (lines 464-486) -- Add routing for generic "notes" fields to the insurance section:

- Before the catch-all `sections.contact` fallback (line 484-485), add a condition:
  - If the key is "notes" or starts with "notes" (but NOT "conversation_notes"), route it to `sections.insurance` instead of `sections.contact`
- This ensures the field appears in the Insurance section of raw patient_intake_notes, where the AI parser can also find it

### 3. AI Prompt Enhancement (same auto-parse file)

The AI system prompt (around line 1109) already instructs the parser to extract "any additional insurance notes" into `insurance_notes`. No change needed here -- the AI should already pick it up from the raw text once the webhook handler routes it correctly.

## Technical Details

### Auto-parse change (around line 668-670)
```
} else if (key.includes('insurance') && key.includes('note')) {
  result.insurance_info.insurance_notes = value;
} else if ((key === 'notes' || key.startsWith('notes ') || key.startsWith('notes_')) && 
           !key.includes('conversation') && !result.insurance_info.insurance_notes) {
  result.insurance_info.insurance_notes = value;
}
```

### Webhook handler change (around line 484)
```
} else if ((key === 'notes' || key.startsWith('notes ') || key.startsWith('notes_') || key.startsWith('notes(')) && 
           !key.includes('conversation')) {
  sections.insurance.push(`${field.key}: ${value}`)
} else {
  sections.contact.push(`${field.key}: ${value}`)
}
```

## Impact
- Existing Alliance Vascular appointments will need a re-parse to pick up the notes from their raw `patient_intake_notes`
- New appointments coming through the webhook will be routed correctly automatically
- No frontend changes needed -- the `ParsedIntakeInfo` component already renders `insurance_notes` in the Medical Information card
