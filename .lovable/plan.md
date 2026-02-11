

# Plan: Fix Generic "Notes" Field Not Being Captured in insurance_notes

## Root Cause
The deployed fix checks for `key === 'notes' || key.startsWith('notes ') || key.startsWith('notes_') || key.startsWith('notes(')` but the GHL custom field key from Naadi Healthcare Manteca is `notes (example: imaging, secondary, etc.) - optional`. When lowercased, this becomes `notes (example: imaging, secondary, etc.) - optional`.

The problem: `key.startsWith('notes ')` checks for "notes" followed by a space, but `key.startsWith('notes(')` checks for "notes" followed by an open paren. The actual key is `notes (example...` which starts with `notes ` (with space) -- so it should match. However, the key also contains "imaging" which means it matches the **imaging check on line 789** (`key.includes('imaging')`) in a LATER else-if branch.

Looking more carefully at the code structure: lines 659-682 form one if/else chain (insurance fields), and lines 683+ form a SEPARATE else-if chain connected to it. The field matches line 670 (`key.startsWith('notes ')`) BUT the imaging check on line 789 is part of the same chain via `else if`. Since the notes check (line 670) comes BEFORE the imaging check (line 789), the notes check should win.

The real issue: the GHL `extractDataFromGHLFields` function IS setting `insurance_notes`, but the AI parser runs AFTER and overwrites it with null. The merge logic needs to preserve GHL-extracted values.

## Changes

### 1. `supabase/functions/auto-parse-intake-notes/index.ts` - Merge logic fix

In the merge section (around line 1200+), ensure that GHL-extracted `insurance_notes` is NOT overwritten by AI-parsed null values. Add explicit logging in extractDataFromGHLFields when the notes field is matched.

Add a console.log after line 672:
```typescript
} else if ((key === 'notes' || key.startsWith('notes ') || key.startsWith('notes_') || key.startsWith('notes(')) && 
           !key.includes('conversation') && !result.insurance_info.insurance_notes) {
  result.insurance_info.insurance_notes = value;
  console.log(`[AUTO-PARSE GHL] Captured generic notes field "${rawKey}" as insurance_notes: ${value}`);
}
```

In the merge section, ensure GHL insurance_notes is preserved when AI returns null:
- Find where `insurance_info` merging happens
- Ensure `insurance_notes` from GHL data takes precedence over null AI results

### 2. Also update the AI prompt

Add explicit instruction in the AI system prompt to extract any "Notes" field (especially ones labeled like "Notes (Example: Imaging...)") into `insurance_notes`, since the raw text contains this under Medical Information section.

Around line 1112, update the insurance_notes description:
```
"insurance_notes": "string or null - Any additional notes from the intake form, including fields labeled 'Notes', secondary insurance info, VA coverage, Medicaid/Medicare notes, or clinical observations documented by the caller. Look for any field like 'Notes (Example: Imaging, Secondary, etc.)' and extract its value here."
```

### 3. Verify merge logic preserves GHL values

Check the merge section to ensure when GHL data has a non-null `insurance_notes` but AI returns null, the GHL value is kept. The current merge uses a "non-null only" strategy but we need to confirm it applies to `insurance_notes` specifically.

## Testing
- Re-deploy the auto-parse function
- Trigger re-parse for "Naadi TEST ONLY" appointment
- Verify `insurance_notes` shows "Both feet and hands, tried all kinds of treatment"
- Confirm it displays in the Medical Information card in the portal
