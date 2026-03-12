

## Remove Duplicate "Previous Treatments" Field

### Problem
The Medical Information section in `ParsedIntakeInfo.tsx` renders `parsedPathologyInfo.previous_treatments` twice:
1. **Line 797-801**: Labeled "Treatments Tried" (in the general pathology section)
2. **Line 890-894**: Labeled "Previous Treatments" (in the FSE/shoulder-specific section)

This causes duplicate display for FSE patients since both sections render.

### Fix
**File: `src/components/appointments/ParsedIntakeInfo.tsx`**

Remove lines 890-895 (the "Previous Treatments" block in the FSE section). The "Treatments Tried" instance at lines 797-801 already covers this data for all procedure types.

