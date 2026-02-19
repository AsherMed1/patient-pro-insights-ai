

# Fix "PAD / Poor Circulation" Showing Contact Last Name

## Problem

The "PAD / Poor Circulation" field in Medical Information shows "TEST ONLY" instead of "Yes". This happens because:

1. The contact's first name is literally "PAD" and last name is "TEST ONLY"
2. The regex on line 599 (`/(?:PAD|poor circulation)[^:]*:\s*([^\n]+)/i`) is too broad -- it matches any line starting with "PAD", including contact name lines like "Full Name: PAD TEST ONLY"
3. Even when the GHL STEP extraction correctly sets `pad_diagnosed = "Yes"`, the AI parser can overwrite it with "TEST ONLY" because it confuses the contact name for a PAD field value
4. The enrichment fallback does not run because `pad_diagnosed` is already (incorrectly) populated

## Solution

Two changes in `supabase/functions/auto-parse-intake-notes/index.ts`:

### 1. Make the regex more specific (line 599)

Replace the broad PAD regex with one that specifically targets the survey question:

```
// Before:
/(?:PAD|poor circulation)[^:]*:\s*([^\n]+)/i

// After:
/(?:have you ever been told you have PAD|poor circulation)[^:]*\??\s*:\s*([^\n]+)/i
```

Also add Yes/No validation on the extracted value so it never picks up names or other text.

### 2. Add a validation guard on pad_diagnosed (after line 604)

After all extraction logic, validate that `pad_diagnosed` contains only a Yes/No type value. If it contains something else (like a contact name), clear it and re-extract from the intake notes.

```typescript
if (parsedData.pathology_info.pad_diagnosed) {
  const padVal = String(parsedData.pathology_info.pad_diagnosed).toLowerCase();
  if (!padVal.includes('yes') && !padVal.includes('no')) {
    console.log(`Clearing invalid pad_diagnosed value: ${parsedData.pathology_info.pad_diagnosed}`);
    parsedData.pathology_info.pad_diagnosed = null;
  }
}
```

### 3. Deploy and reparse

Deploy the updated `auto-parse-intake-notes` edge function and reparse the PAD TEST ONLY appointment to verify the field shows "Yes" instead of "TEST ONLY".

