
# Plan: Always Extract Imaging Details via Regex (Post-AI Enrichment)

## Problem Summary

The `had_imaging_before: YES LAST JANUARY AT CLINIC 123` data is correctly captured in `patient_intake_notes`, but the OpenAI parser didn't extract it into `parsed_medical_info.imaging_details`. The fallback regex parser would have caught this, but it only runs when OpenAI fails completely (rate limit, etc.).

**Current behavior:**
- OpenAI runs and returns partial data (misses `imaging_details`)
- Fallback regex only runs on OpenAI failure
- Critical field `imaging_details` remains null

**Desired behavior:**
- OpenAI runs first
- Regex enrichment runs AFTER to fill any gaps for critical fields
- Imaging details always captured when present in intake notes

---

## Solution

Add a post-AI regex enrichment step that specifically extracts `imaging_details` (and other critical fields) even when AI parsing succeeds. This ensures no data is lost due to AI parsing gaps.

### File: `supabase/functions/auto-parse-intake-notes/index.ts`

**Add after the OpenAI parsing block (around line 1175):**

```typescript
// Post-AI enrichment: Always run regex extraction for critical fields
// This catches anything the AI parser might have missed
function enrichWithCriticalFields(parsedData: any, intakeNotes: string) {
  if (!intakeNotes) return parsedData;
  
  // Ensure medical_info exists
  if (!parsedData.medical_info) {
    parsedData.medical_info = {};
  }
  
  // Extract imaging details if not already populated
  if (!parsedData.medical_info.imaging_details) {
    const imagingPatterns = [
      /had_imaging_before:\s*([^\n|]+)/i,
      /have you had.*?imaging.*?:\s*([^\n|]+)/i,
      /had imaging before:\s*([^\n|]+)/i,
      /previous imaging:\s*([^\n|]+)/i
    ];
    
    for (const pattern of imagingPatterns) {
      const match = intakeNotes.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        parsedData.medical_info.imaging_details = value;
        console.log(`[AUTO-PARSE] Enriched imaging_details via regex: ${value}`);
        break;
      }
    }
  }
  
  return parsedData;
}
```

**Then call it after AI/GHL merging (around line 1201):**

```typescript
// After GHL merge...
parsedData = enrichWithCriticalFields(parsedData, record.patient_intake_notes);
```

---

## Technical Details

### Changes Summary

| Location | Change |
|----------|--------|
| Lines ~520-550 | Add `enrichWithCriticalFields()` function |
| Line ~1201 | Call enrichment function after AI/GHL merge |

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/auto-parse-intake-notes/index.ts` | Add post-AI regex enrichment for critical fields |

---

## Benefits

1. **Reliability** - Critical fields like `imaging_details` are always extracted when present
2. **AI Fallback** - Catches gaps in OpenAI parsing without replacing it
3. **No Breaking Changes** - AI parsing still takes priority; regex only fills gaps
4. **Immediate Fix** - After deploy, trigger reparse on affected records

---

## Verification

After implementation:
1. Deploy the updated edge function
2. Trigger reparse for `2DONOTCONTACT 2TESTLEAD` record
3. Verify `parsed_medical_info.imaging_details` = "YES LAST JANUARY AT CLINIC 123"
4. Confirm it displays in the Medical & PCP Information card in the UI
