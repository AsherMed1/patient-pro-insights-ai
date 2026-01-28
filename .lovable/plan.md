
# Plan: Display "Had Imaging Before?" Field on Portal

## Problem Summary

The "Had Imaging Before?" field from GoHighLevel (containing values like "Yes, PiedMont Aug 2025") is not being displayed on the portal's Patient Pro Insights section. The data flow has two gaps:

1. **GHL extraction gap**: The `extractDataFromGHLFields` function doesn't capture imaging-related custom fields
2. **Field initialization gap**: The `medical_info` result object doesn't include `imaging_details` or `xray_details` fields

## Current Data Flow

```text
GHL Custom Field: "Had Imaging Before?" = "Yes, PiedMont Aug 2025"
        ↓
extractDataFromGHLFields() ← MISSING pattern for imaging fields
        ↓
AI Parser schema includes imaging_details ← But GHL data never populates it
        ↓
ParsedIntakeInfo.tsx has display logic ← But data is always null
```

## Solution

### Part 1: Update Edge Function - `supabase/functions/auto-parse-intake-notes/index.ts`

**Change 1**: Add `imaging_details` and `xray_details` to the `medical_info` initialization (around line 243-249)

```typescript
medical_info: { 
  medications: null as string | null, 
  allergies: null as string | null, 
  pcp_name: null as string | null,
  urologist_name: null as string | null,
  urologist_phone: null as string | null,
  imaging_details: null as string | null,  // NEW
  xray_details: null as string | null       // NEW
},
```

**Change 2**: Add GHL custom field pattern matching for imaging fields (around line 380, after urologist extraction)

```typescript
// Imaging/X-ray fields
else if (key.includes('imaging') || key.includes('x-ray') || key.includes('xray') || 
         key.includes('had imaging') || key.includes('mri') || key.includes('ct scan')) {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('x-ray') || lowerKey.includes('xray')) {
    result.medical_info.xray_details = value;
  } else {
    result.medical_info.imaging_details = value;
  }
}
```

### Part 2: Verify UI Display in ParsedIntakeInfo.tsx

The UI already has display logic for these fields (lines 771-781 and 777-781):
- `xray_details` is displayed if present
- `imaging_details` is displayed if present

However, these are only shown in the "Medical & PCP Information" card. For better visibility, we should also show imaging details in the "Medical Information" card where other pathology data is displayed.

**Change 3**: Add imaging details display to the Medical Information section (around line 594, after `imaging_type`)

```typescript
{formatValue(parsedPathologyInfo?.imaging_done) && (
  <div className="text-sm">
    <span className="text-muted-foreground">Imaging Done:</span>{" "}
    <Badge variant={parsedPathologyInfo.imaging_done === "YES" ? "default" : "secondary"}>
      {parsedPathologyInfo.imaging_done}
    </Badge>
  </div>
)}
{/* NEW: Display imaging details from parsedMedicalInfo */}
{formatValue(parsedMedicalInfo?.imaging_details) && (
  <div className="text-sm">
    <span className="text-muted-foreground">Imaging Details:</span>{" "}
    <span className="font-medium">{parsedMedicalInfo.imaging_details}</span>
  </div>
)}
```

This requires passing `parsedMedicalInfo` to the Medical Information section display logic.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/auto-parse-intake-notes/index.ts` | Add `imaging_details` and `xray_details` to result object, add GHL field extraction pattern |
| `src/components/appointments/ParsedIntakeInfo.tsx` | Display imaging details in Medical Information section (alongside "Imaging Done" badge) |

## Expected Outcome

After implementation:
1. GHL "Had Imaging Before?" field will be extracted during auto-parsing
2. Value like "Yes, PiedMont Aug 2025" will be stored in `parsed_medical_info.imaging_details`
3. Portal will display "Imaging Details: Yes, PiedMont Aug 2025" in the Medical Information section
4. Existing appointments will need re-parsing to populate this field (or manual trigger)
