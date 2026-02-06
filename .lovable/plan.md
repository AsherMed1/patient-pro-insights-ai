

# Plan: Add Fallback Regex Parsing for Critical Fields

## Problem Summary

The webhook changes are working correctly - `had_imaging_before: Yes, Last year january at clinic x` IS captured in `patient_intake_notes`. However, the `parsed_medical_info` field remains `null` because the OpenAI API rate limit (10,000 requests/day) is exhausted, blocking the AI-based parsing step.

---

## Current State

| Field | Status | Value |
|-------|--------|-------|
| `patient_intake_notes` | Captured correctly | Contains `**Medical:** had_imaging_before: Yes, Last year january at clinic x` |
| `parsed_medical_info` | Empty | `null` - AI parser couldn't run |
| `parsed_demographics` | Empty | `null` - AI parser couldn't run |

---

## Proposed Solution

Add a **regex-based fallback parser** that runs when OpenAI fails, extracting critical fields directly from the structured `patient_intake_notes` text without requiring AI.

### Part 1: Create Fallback Parser Function

Add a function to `auto-parse-intake-notes` that uses regex to extract key fields from the already-formatted intake notes:

```typescript
function fallbackRegexParsing(intakeNotes: string): Partial<ParsedResult> {
  const result: Partial<ParsedResult> = {
    medical_info: {},
    pathology_info: {},
    demographics: {},
    insurance_info: {},
    contact_info: {}
  };
  
  // Extract imaging data from Medical section
  const imagingMatch = intakeNotes.match(/had_imaging_before:\s*([^\n|]+)/i);
  if (imagingMatch) {
    result.medical_info.imaging_details = imagingMatch[1].trim();
  }
  
  // Extract insurance provider
  const insuranceProviderMatch = intakeNotes.match(/Please select your insurance provider:\s*([^\n|]+)/i);
  if (insuranceProviderMatch) {
    result.insurance_info.provider = insuranceProviderMatch[1].trim();
  }
  
  // Extract DOB
  const dobMatch = intakeNotes.match(/Date of Birth:\s*([^\n|]+)/i);
  if (dobMatch) {
    result.demographics.dob = dobMatch[1].trim();
  }
  
  // Additional field extractions...
  
  return result;
}
```

### Part 2: Apply Fallback When OpenAI Fails

Modify the error handling in `auto-parse-intake-notes` to use the fallback:

```typescript
} catch (aiError) {
  if (aiError.message?.includes('429')) {
    console.log('[AUTO-PARSE] OpenAI rate limited, using fallback regex parsing');
    const fallbackResult = fallbackRegexParsing(record.patient_intake_notes);
    // Save fallback result to database
  }
}
```

---

## Immediate Fix (Optional)

For the existing DONOTCONTACT TESTLEAD record, I can manually populate the `parsed_medical_info` field right now:

```sql
UPDATE all_appointments
SET parsed_medical_info = '{"imaging_details": "Yes, Last year january at clinic x"}'::jsonb
WHERE id = 'a87c2084-ebab-4cca-ae3a-ef875b1c22c8';
```

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/auto-parse-intake-notes/index.ts` | Add `fallbackRegexParsing()` function and integrate into error handling |

### Key Regex Patterns

| Field | Pattern |
|-------|---------|
| Imaging details | `/had_imaging_before:\s*([^\n\|]+)/i` |
| Insurance provider | `/Please select your insurance provider:\s*([^\n\|]+)/i` |
| DOB | `/Date of Birth:\s*([^\n\|]+)/i` |
| PCP | `/Primary Care.*?:\s*([^\n\|]+)/i` |

---

## Benefits

1. **Resilience** - System continues to work even when OpenAI is unavailable
2. **Cost reduction** - Reduces OpenAI API calls for simple, structured data
3. **Immediate data** - Critical fields are populated without waiting for AI

---

## Alternative: Direct SQL Fix

If you want to fix just the test record immediately without code changes, I can run a direct database update to populate the `parsed_medical_info` field with the imaging data that's already in `patient_intake_notes`.

