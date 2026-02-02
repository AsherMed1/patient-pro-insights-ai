
# Plan: Fix Incomplete Patient Pro Insights for Ally Vascular

## Problem Identified

**397 Ally Vascular appointments** have incomplete Patient Pro Insights data (missing insurance, pathology, and medical information). 

### Root Cause
The GHL webhook only captured basic contact/address information when appointments were created. The complete intake form data (insurance, pathology, PCP) exists in GHL's contact custom fields but wasn't fetched at the time.

### Proof of Solution
I tested one appointment (Kenneth Jackson) by:
1. Calling `fetch-ghl-contact-data` - Retrieved full GHL data including Medicare insurance, GAE pathology, and PCP info
2. Calling `trigger-reparse` - Populated all structured fields

**Before**: Only had address data, no insurance/pathology
**After**: Complete data - Medicare insurance, GAE procedure, pain level 7, PCP Dr. Alfred Mosqueda

---

## Solution: Bulk Re-Enrichment Edge Function

Create a new edge function `backfill-ally-ghl-data` that:
1. Queries all Ally Vascular appointments missing insurance data with valid `ghl_id`
2. For each appointment, calls `fetch-ghl-contact-data` to get full GHL data
3. Triggers `trigger-reparse` to populate structured fields
4. Reports progress and results

---

## Implementation Details

### New Edge Function: `backfill-ally-ghl-data`

| File | Action |
|------|--------|
| `supabase/functions/backfill-ally-ghl-data/index.ts` | Create new bulk enrichment function |

### Function Logic

```text
1. Query all_appointments WHERE:
   - project_name ILIKE '%Ally Vascular%'
   - detected_insurance_provider IS NULL
   - ghl_id IS NOT NULL

2. For each appointment (in batches of 10):
   - Call fetch-ghl-contact-data with appointmentId
   - On success, call trigger-reparse with appointment_id
   - Track success/failure counts
   - Add small delay between batches to avoid rate limits

3. Return summary:
   - Total appointments processed
   - Success count
   - Error count
   - Sample results
```

### Key Implementation Points

- **Rate Limiting**: Process in batches of 10 with 2-second delays to avoid GHL API rate limits
- **Error Handling**: Continue processing even if individual appointments fail
- **Logging**: Detailed progress logging for monitoring
- **Idempotent**: Can be run multiple times safely - only processes appointments still missing data

---

## Execution Plan

1. **Create** the `backfill-ally-ghl-data` edge function
2. **Deploy** the function
3. **Run** the function to process all 397 appointments
4. **Verify** that Patient Pro Insights now shows complete data

---

## Expected Outcome

After running the backfill:
- **397 appointments** will have complete Patient Pro Insights
- Insurance information (provider, plan, ID) populated
- Pathology information (GAE symptoms, duration, pain level) populated  
- Medical & PCP information populated
- All structured fields available in the UI

---

## Technical Notes

- The existing `fetch-ghl-contact-data` function already handles the GHL API call and updates `patient_intake_notes`
- The existing `trigger-reparse` function already handles the AI parsing and populates structured fields
- This backfill simply orchestrates calling these existing functions in bulk
- Estimated time: ~20 minutes for 397 appointments (accounting for rate limiting)
