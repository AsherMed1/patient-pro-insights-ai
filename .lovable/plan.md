
# Plan: Re-parse 111 Ally Vascular Appointments for Insurance Extraction

## Problem Analysis

111 Ally Vascular appointments have insurance-related data in their `patient_intake_notes` but the structured fields are empty:
- `detected_insurance_provider` = null
- `parsed_insurance_info` = empty/null

**Root Cause**: These records were already parsed (`parsing_completed_at` is set), but the AI extraction may have failed to identify the insurance data from the intake notes format.

**Sample Data Pattern** (from investigation):
```text
**Insurance:** insurance_id_link: https://services.leadconnectorhq.com/documents/download/...
```

The notes contain insurance card URLs but no provider names in many cases. Re-parsing with the current AI may extract the `insurance_id_link` URL but the provider/plan extraction requires GHL API enrichment.

---

## Solution: Targeted Batch Re-parse

Create a new edge function that:
1. Queries the specific 111 appointments with insurance mentions but no extracted data
2. Resets their `parsing_completed_at` to null
3. Immediately triggers `auto-parse-intake-notes` to re-process them in batches

This approach leverages the existing parsing infrastructure while targeting only the affected records.

---

## Files to Modify/Create

| File | Action |
|------|--------|
| `supabase/functions/backfill-ally-insurance/index.ts` | Create new edge function |
| `supabase/config.toml` | Add function configuration |

---

## Implementation Details

### New Edge Function: `backfill-ally-insurance`

This function will:

1. **Query target appointments**: Find Ally Vascular appointments where:
   - `patient_intake_notes` contains insurance keywords
   - `detected_insurance_provider` is null/empty
   - `parsed_insurance_info` is null or has no provider

2. **Reset parsing flag**: Set `parsing_completed_at = null` for these records

3. **Trigger auto-parse**: Call the existing `auto-parse-intake-notes` function which processes records in batches of 25

4. **Return statistics**: Report how many records were queued and processed

```typescript
// Pseudocode for the function
const targetAppointments = await supabase
  .from('all_appointments')
  .select('id')
  .ilike('project_name', '%Ally Vascular%')
  .or('detected_insurance_provider.is.null,detected_insurance_provider.eq.')
  .not('patient_intake_notes', 'is', null)
  .or('patient_intake_notes.ilike.%insurance%,...other patterns...')

// Reset parsing_completed_at to null
await supabase
  .from('all_appointments')
  .update({ parsing_completed_at: null })
  .in('id', targetAppointmentIds)

// Trigger auto-parse in a loop until all are processed
while (remainingCount > 0) {
  await fetch('/functions/v1/auto-parse-intake-notes', ...)
  // Small delay between batches
}
```

---

## Execution Flow

```text
1. Call backfill-ally-insurance endpoint
   │
   ▼
2. Query 111 target appointments
   │
   ▼
3. Reset parsing_completed_at = null
   │
   ▼
4. Loop: Call auto-parse-intake-notes (25 records per batch)
   │
   ├─► Batch 1: 25 records parsed
   ├─► Batch 2: 25 records parsed
   ├─► Batch 3: 25 records parsed
   ├─► Batch 4: 25 records parsed
   └─► Batch 5: 11 records parsed
   │
   ▼
5. Return summary: { queued: 111, processed: X, errors: Y }
```

---

## Technical Notes

### GHL API Enrichment
The auto-parse function already attempts to fetch GHL custom fields if:
- The appointment has a `ghl_id`
- The project has `ghl_api_key` and `ghl_location_id`

For "Ally Vascular  and Pain Centers" (double space), GHL credentials exist. For "Ally Vascular and Pain Centers" (single space), they don't. This means:
- ~283 appointments in the double-space project will get GHL enrichment
- ~379 appointments in the single-space project will rely on AI parsing only

### Insurance URL Extraction
The `extractInsuranceUrlFromText` function in auto-parse already handles extracting insurance card URLs from intake notes. Re-parsing should populate `insurance_id_link` for records with GHL document URLs.

---

## Expected Outcome

After running the backfill:

| Field | Before | After |
|-------|--------|-------|
| `insurance_id_link` | null | Populated from GHL URL in notes |
| `detected_insurance_provider` | null | Populated if found in GHL or notes |
| `parsed_insurance_info` | empty | Populated with extracted data |

---

## Acceptance Criteria

| Criteria | Implementation |
|----------|----------------|
| 111 appointments re-queued for parsing | Reset `parsing_completed_at` to null |
| Insurance URLs extracted from notes | `extractInsuranceUrlFromText` handles this |
| Batch processing (no timeouts) | 25 records per batch with delays |
| Progress reporting | Return counts of queued/processed/errors |
