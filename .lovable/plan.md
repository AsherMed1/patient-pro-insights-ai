

# Plan: Fix "Had Imaging Before?" Field Not Pulling from GHL

## Problem Identified

The GHL custom field **"Had Imaging Before?"** with detailed responses like "Yes mri both knees are messed up" is not being captured or displayed in Patient Pro Insights for AVA Vascular appointments.

### Root Cause

The `fetch-ghl-contact-data` edge function categorizes GHL custom fields into sections (Contact, Insurance, Pathology, Medical) based on keyword matching. The field "Had Imaging Before?" doesn't match any current keywords and is **being skipped entirely**.

Current keyword categories (lines 220-228):
- **Insurance**: `insurance`, `member`, `group`, `policy`
- **Pathology**: `pain`, `symptom`, `condition`, `diagnosis`, `affected`, `duration`, `treat`
- **Medical**: `medication`, `allerg`, `medical`, `pcp`, `doctor`
- **Contact**: `phone`, `email`, `address`, `contact`, `name`, `dob`, `date of birth`

The word `imaging` is not in any category, so "Had Imaging Before?" is silently discarded.

---

## Solution

### 1. Update `fetch-ghl-contact-data` to capture imaging fields

Add `imaging`, `xray`, `x-ray`, `mri`, and `ct` keywords to the **Medical Information** category so imaging-related fields are included in `patient_intake_notes`.

### 2. Verify `auto-parse-intake-notes` extracts the value correctly

The parser already has logic for imaging fields (lines 434-459). Once the field appears in the notes, it will be extracted to `parsed_medical_info.imaging_details`.

### 3. UI already supports display

The `ParsedIntakeInfo` component already displays `parsedMedicalInfo?.imaging_details` as "Imaging Details:" in the Medical & PCP Information section (line 962-966).

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/fetch-ghl-contact-data/index.ts` | Add imaging keywords to Medical Information categorization |

---

## Implementation Details

### Update categorization logic in `fetch-ghl-contact-data`

```typescript
// Line 224 - Add imaging keywords to Medical Information category
} else if (key.includes('medication') || key.includes('allerg') || 
           key.includes('medical') || key.includes('pcp') || key.includes('doctor') ||
           key.includes('imaging') || key.includes('xray') || key.includes('x-ray') || 
           key.includes('mri') || key.includes('ct scan')) {
  sections['Medical Information'].push(formattedLine);
}
```

This will ensure that:
- "Had Imaging Before?" → categorized as Medical Information
- "Have you had a knee X-ray or MRI?" → categorized as Medical Information
- Any other imaging-related fields are captured

---

## Testing

After deployment:
1. Trigger re-fetch for Bryan Castellanos appointment
2. Verify "Had Imaging Before?: Yes mri both knees are messed up." appears in patient_intake_notes
3. Trigger reparse to populate parsed_medical_info.imaging_details
4. Confirm it displays in the Medical & PCP Information section

---

## Impact

- **Immediate**: New appointments will capture imaging data correctly
- **Existing AVA Vascular appointments**: Will need a re-fetch from GHL to populate the field
- **Other projects**: Will also benefit if they have similar imaging fields

