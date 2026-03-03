

## Hide "OA or TKR Diagnosed" for FSE Procedures

**Problem**: The "OA or TKR Diagnosed" field is knee-specific (OA = Osteoarthritis, TKR = Total Knee Replacement) and irrelevant for FSE (Frozen Shoulder Embolization) appointments. It currently displays for all procedure types.

**Fix**: In `src/components/appointments/ParsedIntakeInfo.tsx` (~line 760), wrap the existing `oa_tkr_diagnosed` render block with a condition that hides it when `procedure_type` is `'FSE'`.

```tsx
{formatValue(parsedPathologyInfo.oa_tkr_diagnosed) && 
 parsedPathologyInfo.procedure_type?.toUpperCase() !== 'FSE' && (
  <div className="text-sm">...</div>
)}
```

Single line change, one file.

