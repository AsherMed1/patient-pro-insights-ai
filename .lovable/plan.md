
# Plan: Fix Stale Medical Information Display for Service-Change Patients

## Problem Summary

Cassandra Evans switched from GAE to UFE consultation, but the Medical Information section still shows GAE pathology (knee pain) instead of UFE data (pelvic pain, heavy periods). This happens because:

1. The GHL custom field extraction ignores the appointment's current procedure type
2. GHL-extracted pathology (GAE) overwrites AI-extracted pathology (UFE) during merging
3. Stale pathology data is displayed even when parsing_completed_at is NULL

---

## Solution (3 Parts)

### Part 1: Hide Medical Info While Reparse is Pending

**File:** `src/components/appointments/ParsedIntakeInfo.tsx`

When `parsing_completed_at` is NULL or undefined, hide the Medical Information section entirely to prevent showing stale data. Add a "parsing pending" indicator in its place.

**Changes:**
- Add new prop `parsingCompletedAt?: string | null`
- When parsing is pending and pathology exists, show message: "Medical data is being refreshed..."
- Components using ParsedIntakeInfo (AppointmentCard, DetailedAppointmentView) will pass this prop

---

### Part 2: Prefer GHL Structured Fields Over AI (with Procedure Filtering)

**File:** `supabase/functions/auto-parse-intake-notes/index.ts`

Restructure the data extraction to:
1. Pass the detected calendar procedure to `extractDataFromGHLFields`
2. Filter GHL custom fields to only extract pathology for the matching procedure
3. Skip AI call entirely if GHL has complete structured STEP data for the current procedure
4. Only use AI as fallback when GHL data is incomplete

**Logic Changes:**

```text
1. Detect procedure from calendar_name (UFE, PAE, GAE, PFE)
2. Fetch GHL custom fields
3. In extractDataFromGHLFields():
   - Only extract pathology from fields matching the detected procedure
   - If field key contains "GAE" but procedure is "UFE", skip it
   - Track which structured fields were found (e.g., "UFE STEP 1", "UFE STEP 2")
4. If structured STEP fields exist for the procedure:
   - Use GHL data directly (no AI call)
   - Build pathology_info from STEP answers
5. If no structured STEP data:
   - Call AI with procedure context (existing logic)
   - Merge AI result with GHL contact/insurance data
```

**New helper function:**

```typescript
function extractProcedureStepDataFromGHL(
  contact: any, 
  customFieldDefs: Record<string, string>,
  targetProcedure: string | null
): { hasCompleteStepData: boolean; pathologyInfo: any; ... }
```

---

### Part 3: Reset Old Pathology When Calendar Changes

**File:** `supabase/functions/auto-parse-intake-notes/index.ts`

Add logic to detect when the current pathology's procedure_type doesn't match the calendar-derived procedure, and clear it before reparsing:

```typescript
// Before processing, check if existing pathology is stale
if (calendarProcedure && existingPathology?.procedure_type) {
  if (existingPathology.procedure_type !== calendarProcedure) {
    console.log(`[AUTO-PARSE] Procedure change detected: ${existingPathology.procedure_type} -> ${calendarProcedure}, clearing stale pathology`);
    // Don't merge with old pathology
    skipPathologyMerge = true;
  }
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/auto-parse-intake-notes/index.ts` | Add procedure filtering to GHL extraction, prefer structured STEP data over AI, clear stale pathology on procedure change |
| `src/components/appointments/ParsedIntakeInfo.tsx` | Add `parsingCompletedAt` prop, hide Medical Info section when pending |
| `src/components/appointments/AppointmentCard.tsx` | Pass `parsingCompletedAt` to ParsedIntakeInfo |
| `src/components/appointments/DetailedAppointmentView.tsx` | Pass `parsingCompletedAt` to ParsedIntakeInfo |
| `src/components/appointments/types.ts` | Ensure `parsing_completed_at` is in AllAppointment interface (already there) |

---

## Technical Details

### GHL Field Filtering Logic

For Cassandra Evans, GHL fields include both:
- `GAE STEP 1 | How long have you been experiencing knee pain?`
- `UFE STEP 1 | How often do you experience pelvic pain?`

The current code processes all of them. The fix will check:

```typescript
// In extractDataFromGHLFields
const fieldProcedure = detectProcedureFromFieldKey(key);
if (targetProcedure && fieldProcedure && fieldProcedure !== targetProcedure) {
  // Skip - this field is for a different procedure
  continue;
}
```

### Structured Step Data Detection

GHL uses "STEP 1" and "STEP 2" naming for procedure-specific intake questions. When these exist for the target procedure, we can extract all pathology without calling OpenAI:

| UFE STEP Field | Maps To |
|----------------|---------|
| pelvic pain frequency | symptoms |
| menstrual cycle | symptoms |
| period heaviness | symptoms |
| pain during intercourse | symptoms |
| urinary symptoms | symptoms |

---

## Expected Outcome

After these changes:

1. **Cassandra Evans** will show UFE-specific medical info:
   - Pathology: UFE
   - Symptoms: Pelvic pain, heavy periods, urinary urgency
   
2. **Patients who change services** will automatically have their medical info updated to match the new procedure

3. **OpenAI rate limits** will have less impact since structured GHL STEP data bypasses AI entirely

4. **No stale data shown** while reparsing is in progress

---

## Immediate Fix for Cassandra Evans

After deployment, reset her parsing and trigger reparse:

```sql
UPDATE all_appointments 
SET parsing_completed_at = NULL, parsed_pathology_info = NULL
WHERE id = 'e8f9c5d6-b3a2-4e8f-9d1a-7c6e5f4a3b2c';
```

Then trigger the auto-parse function.
