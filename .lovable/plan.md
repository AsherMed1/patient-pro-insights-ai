

# Plan: Fix "Had Imaging Before" Field Capture

## Problem Summary

The `had_imaging_before` field you're sending via GHL webhook customFields is not appearing in the UI because:

1. **Categorization Gap**: The field key `had_imaging_before` (which contains "imaging") is not being routed to the Medical section in the webhook handler - it falls through to Contact by default.

2. **Data Overwrite**: Even if categorized correctly, the GHL enrichment process fetches fresh contact data and overwrites the `patient_intake_notes` field, losing your custom webhook fields.

---

## Current Data Status

For your DONOTCONTACT TESTLEAD records:
- `parsed_pathology_info.imaging_done` = **YES** (working - from STEP field "Have you had a knee X-ray or MRI or CT?")
- `parsed_medical_info.imaging_details` = **null** (missing)

The STEP field answer `☑️ YES` is correctly being extracted as `imaging_done: YES`, but since it's a simple YES/NO checkbox answer, it doesn't provide the descriptive text for `imaging_details`.

---

## Solution

### Part 1: Add "imaging" to Medical Categorization

Update `ghl-webhook-handler` to route imaging-related fields to the Medical section instead of Contact.

**File:** `supabase/functions/ghl-webhook-handler/index.ts`

Update line 482:
```typescript
// Before:
} else if (key.includes('medication') || key.includes('allergy') || key.includes('pcp') || key.includes('doctor')) {

// After:
} else if (key.includes('medication') || key.includes('allergy') || key.includes('pcp') || key.includes('doctor') || key.includes('imaging') || key.includes('xray') || key.includes('x-ray') || key.includes('mri') || key.includes('ct scan')) {
```

### Part 2: Handle "☑️ YES" checkbox values in imaging extraction

Update `auto-parse-intake-notes` to extract the `YES` value from checkbox-style answers like `☑️ YES`.

**File:** `supabase/functions/auto-parse-intake-notes/index.ts`

In the imaging field extraction block (lines 467-483), improve the value detection:

```typescript
// Check if this is the "Have you had a knee X-ray or MRI or CT?" field from GAE STEP
if (lowerKey.includes('have you had') && (lowerKey.includes('x-ray') || lowerKey.includes('mri') || lowerKey.includes('ct'))) {
  const lowerValue = valueStr.toLowerCase().trim();
  // Handle checkbox format "☑️ YES" or plain "YES"/"NO"
  const cleanValue = valueStr.replace(/^☑️\s*/, '').trim();
  
  // If value has details beyond YES/NO, store as imaging_details
  if (cleanValue.toLowerCase() !== 'yes' && cleanValue.toLowerCase() !== 'no') {
    result.medical_info.imaging_details = valueStr;
  } else if (cleanValue.toLowerCase() === 'yes' && !result.medical_info.imaging_details) {
    // For simple YES answers, store a descriptive placeholder
    result.medical_info.imaging_details = 'Patient has had previous imaging';
  }
  console.log(`[AUTO-PARSE GHL] Found imaging STEP field "${key}": ${valueStr}`);
}
```

---

## Alternative: Use the Existing Data

The STEP field "Have you had a knee X-ray or MRI or CT?" with value `☑️ YES` is already being correctly captured in `parsed_pathology_info.imaging_done = "YES"`.

If the UI displays the "Imaging Done" badge from `pathology_info.imaging_done`, the data IS showing - just not in the `imaging_details` field you were looking for.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/ghl-webhook-handler/index.ts` | Add imaging-related keywords to medical section categorization |
| `supabase/functions/auto-parse-intake-notes/index.ts` | Improve checkbox value handling for imaging fields |

---

## Alternative: Display "Imaging Done" in UI

If the goal is simply to show imaging information in the Medical Information section of the UI, we could update `ParsedIntakeInfo.tsx` to also display `parsed_pathology_info.imaging_done` when `imaging_details` is null.

This would show "Imaging Done: YES" without requiring any backend changes.

---

## Summary

The `had_imaging_before` field is being overwritten by GHL enrichment. The solution is to:

1. Add "imaging" keywords to the medical section categorization in the webhook handler
2. Improve checkbox value handling in the auto-parser to create meaningful `imaging_details` from YES/NO answers
3. Alternatively, update the UI to display `imaging_done` from pathology info when medical imaging details are null

