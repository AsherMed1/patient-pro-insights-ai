

## Fix: GHL Booking Script Stored as Imaging Details

### Problem
The "Had Imaging Before" field for some TVI patients (e.g., Oralia Gabriela Cabrera Martinez) contains the entire GHL AI booking script/prompt text instead of actual imaging information. The parser is blindly storing the GHL custom field value without validating it.

### Root Cause
In `auto-parse-intake-notes/index.ts` (lines 974-977), when the parser encounters a GHL field matching `'had imaging'` or `'imaging before'`, it stores the raw value without checking if it's actually patient data or a bot configuration prompt.

### Changes

| File | Change |
|------|--------|
| `supabase/functions/auto-parse-intake-notes/index.ts` | Add a sanitization check before storing `imaging_details` — if the value exceeds ~200 characters or contains keywords like "booking", "consultation", "schedule", "challenger sale", treat it as a bot prompt and discard it (store `null` or a simple "YES"/"NO" based on surrounding context) |
| `src/components/appointments/ParsedIntakeInfo.tsx` | Add a defensive max-length guard on the `imaging_details` display — if the value exceeds 300 characters, truncate or hide it to prevent prompt text from ever rendering in the UI |
| **One-time data fix** | Update the existing corrupted record for Oralia Gabriela Cabrera Martinez (`id: 651bd8eb`) to clear the bad `imaging_details` value and set it to `'Patient has had previous imaging'` based on imaging_done=YES |

### Technical Detail

**Parser sanitization** (`auto-parse-intake-notes/index.ts`, ~line 974):
```typescript
} else if (lowerKey.includes('had imaging') || lowerKey.includes('imaging before')) {
  // Guard against GHL bot prompts stored in imaging fields
  if (valueStr.length > 200 || /booking|consultation|schedule|challenger/i.test(valueStr)) {
    console.log(`[AUTO-PARSE GHL] Skipping bot prompt in imaging field: ${valueStr.substring(0, 50)}...`);
    if (!result.medical_info.imaging_details) {
      result.medical_info.imaging_details = 'Patient has had previous imaging';
    }
  } else {
    result.medical_info.imaging_details = valueStr;
  }
}
```

**UI guard** (`ParsedIntakeInfo.tsx`, ~line 811):
```typescript
{formatValue(parsedMedicalInfo?.imaging_details) && 
 parsedMedicalInfo.imaging_details.length < 300 && (
```

**Data fix** (SQL):
```sql
UPDATE all_appointments 
SET parsed_medical_info = jsonb_set(parsed_medical_info, '{imaging_details}', '"Patient has had previous imaging"')
WHERE id = '651bd8eb-d743-4eb1-bf45-53f5eb9aa5a5';
```

