

# Plan: Fix PCP and Imaging Data Extraction for Liberty Joint & Vascular

## Problem Summary

For "Dr. Rachel TEST" in Liberty Joint & Vascular, the user entered PCP (Primary Care Doctor) and imaging information on the GHL insurance link, but this data is not displaying in the Patient Pro Insights portal. Investigation confirms:

1. **GHL data was captured** - The raw `patient_intake_notes` contains:
   - `Primary Care Doctor's Name and Phone: Jones 214-555-5555`
   - `Had Imaging Before?: Yes at homie xray`

2. **Data not extracted** - The `parsed_medical_info` shows null for `pcp_name`, `pcp_phone`, and `imaging_details`

3. **Root causes identified**:
   - PCP field extraction only stores `pcp_name` but doesn't parse the phone from combined values
   - The record's `parsing_completed_at` is null, meaning auto-parse hasn't processed the updated notes

---

## Root Cause Analysis

### Issue 1: PCP Parsing Does Not Extract Phone

The GHL field `Primary Care Doctor's Name and Phone` contains a combined value: `Jones 214-555-5555`

Current code (line 417-418):
```typescript
else if (key.includes('pcp') || key.includes('doctor') || key.includes('physician')) {
  result.medical_info.pcp_name = value; // Stores entire value without parsing phone
}
```

The urologist extraction (lines 421-432) already has logic to parse combined name+phone values, but PCP does not.

### Issue 2: Auto-Parse Not Re-Triggered

When `fetch-ghl-contact-data` appends new GHL data to `patient_intake_notes`, it updates the record but does not:
- Reset `parsing_completed_at` to null (to trigger re-parsing)
- Directly trigger the auto-parse function

The record shows `parsing_completed_at: null`, indicating parsing is pending, but the auto-parse batch process may not have run recently.

---

## Solution

### Part 1: Enhance PCP Field Extraction

Update `auto-parse-intake-notes/index.ts` to parse combined PCP name+phone values similar to urologist handling.

**Changes to lines 417-419:**

```typescript
else if (key.includes('pcp') || key.includes('doctor') || key.includes('physician') || 
         key.includes('primary care')) {
  // Try to extract name and phone from combined value like "Jones 214-555-5555"
  const value_str = String(value);
  
  // Pattern: Look for phone number (XXX-XXX-XXXX, (XXX) XXX-XXXX, or 10 digits)
  const phonePatterns = [
    /(\d{3}-\d{3}-\d{4})/,           // 214-555-5555
    /(\(\d{3}\)\s*\d{3}-\d{4})/,     // (214) 555-5555
    /(\d{10,})/                       // 2145555555
  ];
  
  let phoneMatch = null;
  for (const pattern of phonePatterns) {
    phoneMatch = value_str.match(pattern);
    if (phoneMatch) break;
  }
  
  if (phoneMatch) {
    const phone = phoneMatch[1];
    const name = value_str.replace(phone, '').replace(/^\s*[-,]\s*|\s*[-,]\s*$/g, '').trim();
    result.medical_info.pcp_name = name || value_str;
    result.medical_info.pcp_phone = phone;
  } else {
    result.medical_info.pcp_name = value_str;
  }
}
```

### Part 2: Ensure Imaging Details Are Captured

The current imaging logic (lines 434-458) should capture `Had Imaging Before?: Yes at homie xray` and store it in `imaging_details`. Verify this works by adding a log statement.

### Part 3: Add "primary care" Keyword Match

The field name `Primary Care Doctor's Name and Phone` would be better matched with `primary care` in addition to `doctor`.

---

## Technical Changes

### File: `supabase/functions/auto-parse-intake-notes/index.ts`

**1. Enhance PCP extraction (replace lines 417-419):**

Add phone parsing logic similar to urologist handling, and add `primary care` keyword.

**2. Add logging for imaging fields (around line 458):**

Add a console.log when imaging fields are matched to verify extraction.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/auto-parse-intake-notes/index.ts` | Add PCP phone parsing logic, add `primary care` keyword match, add imaging logging |

---

## Testing After Implementation

1. Re-trigger parsing for Dr. Rachel TEST:
   - Call `auto-parse-intake-notes` edge function
   - Or manually reset `parsing_completed_at` to null and wait for batch

2. Verify `parsed_medical_info` contains:
   - `pcp_name: "Jones"`
   - `pcp_phone: "214-555-5555"` 
   - `imaging_details: "Yes at homie xray"`

3. Confirm Patient Pro Insights portal displays PCP and imaging information

---

## Summary

The fix involves enhancing the GHL field extraction logic to:
1. Parse combined PCP name+phone values (like urologist already does)
2. Add `primary care` as a keyword for PCP field matching
3. Deploy the updated function and re-parse affected records

