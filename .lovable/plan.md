

## Make Internal Notes Descriptive for JSONB Field Updates

### Problem

When a user edits PCP info, contact info, or other JSONB fields, the internal note reads:

> Portal update by Jenny S: Updated parsed_medical_info to "[object Object]"

This happens because the edge function uses string interpolation on JavaScript objects, and the client doesn't send `previousValues` for JSONB fields.

### Solution

Two changes are needed:

**1. Edge function (`supabase/functions/update-appointment-fields/index.ts`)**

Update the change-details builder (lines 89-96) to detect when a value is an object and produce a human-readable summary instead of `[object Object]`. Specifically:

- Map known JSONB field names to friendly labels:
  - `parsed_medical_info` -> "PCP/Medical Info"
  - `parsed_contact_info` -> "Contact Info"  
  - `parsed_insurance_info` -> "Insurance Info"
  - `parsed_pathology_info` -> "Pathology Info"
  - `parsed_demographics` -> "Demographics"
- When the new value is an object, list only the non-null sub-fields that were set (e.g., `pcp_name: "Dr. Smith", pcp_phone: "555-1234"`)
- When `previousValues` is provided for that field, show a diff of changed sub-fields only

Example output after fix:

> Portal update by Jenny S: Updated PCP/Medical Info (pcp_name: "Dr. Smith", pcp_phone: "478-555-1234", pcp_address: "123 Main St")

Or with previous values:

> Portal update by Jenny S: Updated PCP/Medical Info (pcp_name from "Dr. Jones" to "Dr. Smith")

**2. Client-side: pass `previousValues` from save handlers**

In `src/components/appointments/ParsedIntakeInfo.tsx`:

- **`handleSavePCP` (~line 244):** Add `previousValues: { parsed_medical_info: parsedMedicalInfo }` to the request body so the edge function can diff old vs new.
- **`handleSaveContact` (~line 308):** Add `previousValues: { parsed_contact_info: parsedContactInfo }` similarly.

### Technical Detail

In the edge function, replace the change-details builder with logic like:

```typescript
const friendlyNames = {
  parsed_medical_info: 'PCP/Medical Info',
  parsed_contact_info: 'Contact Info',
  parsed_insurance_info: 'Insurance Info',
  parsed_pathology_info: 'Pathology Info',
  parsed_demographics: 'Demographics',
};

const changeDetails = nonDateFields.map(field => {
  const oldVal = previousValues?.[field];
  const newVal = updates[field];
  const label = friendlyNames[field] || field;

  // Handle JSONB objects
  if (typeof newVal === 'object' && newVal !== null) {
    if (typeof oldVal === 'object' && oldVal !== null) {
      // Diff: show only changed sub-fields
      const diffs = Object.keys(newVal)
        .filter(k => JSON.stringify(newVal[k]) !== JSON.stringify(oldVal[k]) && newVal[k] != null)
        .map(k => oldVal[k] != null
          ? `${k} from "${oldVal[k]}" to "${newVal[k]}"`
          : `${k}: "${newVal[k]}"`)
        .join(', ');
      return diffs ? `${label} (${diffs})` : null;
    }
    // No previous value -- list non-null sub-fields
    const summary = Object.entries(newVal)
      .filter(([_, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}: "${v}"`)
      .join(', ');
    return `${label} (${summary})`;
  }

  // Scalar fields (existing logic)
  if (oldVal !== undefined && oldVal !== null) {
    return `${label} from "${oldVal}" to "${newVal}"`;
  }
  return `${label} to "${newVal}"`;
}).filter(Boolean).join(', ');
```

### Files to Change

| File | Change |
|------|--------|
| `supabase/functions/update-appointment-fields/index.ts` | Replace change-details builder with JSONB-aware formatting and friendly field names |
| `src/components/appointments/ParsedIntakeInfo.tsx` | Pass `previousValues` in `handleSavePCP` and `handleSaveContact` |

