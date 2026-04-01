

## Fix: HAE Procedure Not Recognized by Auto-Parser

### Problem
The calendar name "Request Your **HAE** Consultation at Great Neck, NY" is not recognized because **HAE** (Hereditary Angioedema / Hemorrhoid Artery Embolization) is missing from all procedure detection functions. This causes:
1. No procedure filtering on GHL custom fields — wrong procedure data (GAE) gets pulled in
2. Fallback regex finds "GAE" in the raw notes text and incorrectly assigns it
3. Medical Information section shows only "Age Range" (duplicated) with no relevant pathology data

### Root Cause
Three functions in `auto-parse-intake-notes/index.ts` lack HAE mappings:
- `detectProcedureFromCalendar()` — line 1155
- `detectProcedureFromFieldKey()` — line 700
- Fallback regex parser — line 485

### Fix (Single File)

**`supabase/functions/auto-parse-intake-notes/index.ts`**

Add HAE to all three procedure detection points:

1. **`detectProcedureFromCalendar`** (after GAE block, ~line 1167):
   ```
   if (name.includes('hae')) return 'HAE';
   ```

2. **`detectProcedureFromFieldKey`** (after GAE block, ~line 703):
   ```
   if (upperKey.includes('HAE')) return 'HAE';
   ```

3. **Fallback regex parser** (after GAE block, ~line 488):
   ```
   } else if (upperNotes.includes('HAE')) {
     result.pathology_info.procedure_type = 'HAE';
   ```

After deploying, the test patient can be re-parsed via the "Refresh from GHL" button to pull correct HAE data.

### Post-Fix
- Re-trigger parsing for DONOTCONTACT TESTLEAD's HAE appointment to verify correct procedure detection and field population.

