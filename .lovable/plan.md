
# Plan: Move Insurance Notes to Medical Information Section

## Current State

The "Insurance Notes" field is currently displayed in the **Insurance Information** section (green card) at lines 520-527:

```tsx
{formatValue(parsedInsuranceInfo?.insurance_notes) && (
  <div className="text-sm pt-2 border-t border-blue-200 mt-2">
    <span className="text-muted-foreground">Insurance Notes:</span>{" "}
    <span className="font-medium text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
      {parsedInsuranceInfo.insurance_notes}
    </span>
  </div>
)}
```

This field often contains clinical information (e.g., "Diagnosed with fibroids around 2y ago - Had bleeding for 31 days straight...") that belongs in the Medical section rather than Insurance.

---

## Solution

Move the notes display from the Insurance Information card to the **Medical Information** card (amber-colored section), and rename the label from "Insurance Notes" to "Notes".

### Changes to `src/components/appointments/ParsedIntakeInfo.tsx`:

1. **Remove** the Insurance Notes display from the Insurance Information section (lines 520-527)

2. **Add** a "Notes" field to the Medical Information section (after line 704, before the closing `</CardContent>`)

3. **Update styling** to match the amber/medical theme instead of blue

---

## Code Changes

### Remove from Insurance Section (lines 520-527):
Delete this block entirely from the Insurance Information card.

### Add to Medical Information Section (after line 704):
```tsx
{formatValue(parsedInsuranceInfo?.insurance_notes) && (
  <div className="text-sm pt-2 border-t border-amber-200 mt-2">
    <span className="text-muted-foreground">Notes:</span>{" "}
    <span className="font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
      {parsedInsuranceInfo.insurance_notes}
    </span>
  </div>
)}
```

---

## Visual Change

| Before | After |
|--------|-------|
| Insurance Information card shows "Insurance Notes" with blue styling | Insurance Information card has no notes field |
| Medical Information card has no notes | Medical Information card shows "Notes" with amber styling at the bottom |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/appointments/ParsedIntakeInfo.tsx` | Move notes from Insurance section to Medical Information section, rename label to "Notes" |

---

## Expected Outcome

- The clinical notes ("Diagnosed with fibroids...", "Hysterectomy schedule...") will appear in the Medical Information section where they logically belong
- The label will be simplified to "Notes" for broader applicability
- The styling will match the amber medical theme
