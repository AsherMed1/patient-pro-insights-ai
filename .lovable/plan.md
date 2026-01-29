
# Plan: Fix Stale Medical Information Display for Service-Change Patients

## ✅ COMPLETED

All three parts of this fix have been implemented.

---

## Implementation Summary

### Part 1: Hide Medical Info While Reparse is Pending ✅

**Files Modified:**
- `src/components/appointments/ParsedIntakeInfo.tsx`
- `src/components/appointments/AppointmentCard.tsx`
- `src/components/appointments/DetailedAppointmentView.tsx`

**Changes:**
- Added `parsingCompletedAt` prop to ParsedIntakeInfo component
- Medical Information section now only displays when `parsingCompletedAt` is set
- Both AppointmentCard and DetailedAppointmentView pass this prop correctly

---

### Part 2: Prefer GHL Structured Fields Over AI (with Procedure Filtering) ✅

**File Modified:** `supabase/functions/auto-parse-intake-notes/index.ts`

**Changes:**
1. Added `detectProcedureFromFieldKey()` helper to identify procedure from GHL field names
2. Updated `extractDataFromGHLFields()` to accept `targetProcedure` parameter
3. GHL custom fields are now filtered to only extract pathology for the matching procedure
4. Added `hasCompleteStepData` tracking for structured GHL STEP fields
5. When GHL has complete STEP data, it's preferred over AI parsing for pathology
6. Procedure type is automatically set from calendar if known

---

### Part 3: Reset Old Pathology When Calendar Changes ✅

**File Modified:** `supabase/functions/auto-parse-intake-notes/index.ts`

**Changes:**
- Calendar procedure is detected early in the processing loop
- GHL extraction uses procedure filtering to skip fields from old procedures
- Merge logic ensures procedure_type is always set from current calendar
- AI prompt includes procedure context to prioritize correct pathology

---

## Technical Details

### GHL Field Filtering Logic

For patients like Cassandra Evans who have both GAE and UFE fields:
- `GAE STEP 1 | How long have you been experiencing knee pain?` → **SKIPPED** (current appointment is UFE)
- `UFE STEP 1 | How often do you experience pelvic pain?` → **EXTRACTED**

### Structured Step Data Detection

When 2+ STEP fields are found for the target procedure, `hasCompleteStepData` is set to true:
- GHL structured data is preferred for pathology
- AI is still used as fallback for incomplete data
- Reduces OpenAI API usage and rate limit issues

---

## Immediate Fix for Cassandra Evans

To update her record after deployment:

```sql
UPDATE all_appointments 
SET parsing_completed_at = NULL, parsed_pathology_info = NULL
WHERE lead_name = 'Cassandra Evans' AND project_name = 'Premier Vascular';
```

Then trigger reparse via the UI refresh button or call the auto-parse function.
