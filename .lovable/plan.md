

# Plan: Remove Duplicate Imaging Details Display

## Problem

The `imaging_details` field is currently displayed in TWO cards:
1. **Medical Information** (amber card) - Line 767-772 as "Had Imaging Before"
2. **Medical & PCP Information** (teal card) - Line 962-967 as "Imaging Details"

This creates confusing redundancy as seen in the screenshot.

---

## Solution

Remove the duplicate from the **Medical & PCP Information** card (teal) and keep it only in the **Medical Information** card (amber) where it logically belongs with other pathology/imaging data.

### File: `src/components/appointments/ParsedIntakeInfo.tsx`

**Remove lines 962-967:**

```tsx
// DELETE this block from Medical & PCP Information section:
{formatValue(parsedMedicalInfo?.imaging_details) && (
  <div className="text-sm">
    <span className="text-muted-foreground">Imaging Details:</span>{" "}
    <span className="font-medium">{parsedMedicalInfo.imaging_details}</span>
  </div>
)}
```

---

## Result

After the change:
- **Medical Information card** → Will show "Had Imaging Before: YES LAST JANUARY AT CLINIC XYZ"
- **Medical & PCP Information card** → Will show only PCP Name, Phone, Address, Urologist (if applicable), X-ray Details, Medications, and Allergies

---

## Technical Details

| File | Change |
|------|--------|
| `src/components/appointments/ParsedIntakeInfo.tsx` | Remove lines 962-967 (imaging_details in Medical & PCP card) |

