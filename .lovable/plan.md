

## Fix: Notes Field Not Showing in Portal + Backfill

### Root Cause
The categorization fix from the last edit IS working -- the "Notes" field now correctly routes to Insurance Information. However, two issues prevent it from appearing in the portal:

1. **`fetch-ghl-contact-data` overwrites existing notes**: Line 38 selects `id, ghl_appointment_id, ghl_id, project_name, lead_name` but NOT `patient_intake_notes`. When it later reads `appointment.patient_intake_notes`, it gets `undefined`, treating it as empty and replacing all existing notes instead of appending. This erased the original webhook data.

2. **Reparse not triggered**: After the enrichment, the AI parser needs to run to extract "TEST" from the intake notes into `parsed_insurance_info.insurance_notes`, which is what the portal UI reads (line 889 of `ParsedIntakeInfo.tsx`).

### Changes

| Step | Action |
|------|--------|
| 1 | Fix `fetch-ghl-contact-data` to include `patient_intake_notes` in its select query so it appends instead of overwrites |
| 2 | Trigger reparse for BVC TEST ONLY (`1671ba97-9898-4916-8452-4c3b93b9ff1c`) to populate `parsed_insurance_info.insurance_notes` with "TEST" |
| 3 | Trigger reparse for all Buffalo Vascular Care appointments that have `patient_intake_notes` containing "Notes" to backfill any other missed records |

### Technical Detail

**File: `supabase/functions/fetch-ghl-contact-data/index.ts`** (line 38)

```typescript
// BEFORE:
.select('id, ghl_appointment_id, ghl_id, project_name, lead_name')

// AFTER:
.select('id, ghl_appointment_id, ghl_id, project_name, lead_name, patient_intake_notes')
```

This one-line fix ensures the function reads existing notes before appending, preventing data loss.

**Backfill**: Call `reparse-specific-appointments` with relevant Buffalo Vascular Care appointment IDs to re-run the AI parser and populate `parsed_insurance_info.insurance_notes`.

