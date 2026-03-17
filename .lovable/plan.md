

## Fix: Strip OON System Messages from Insurance Notes Display

### Problem
The "Notes:" field in the Medical Information section shows system-generated OON text ("These insurance plans are not accepted at this clinic: Other.") concatenated with the user's actual note ("TEST note section"). This OON message originates from GHL data or the AI parser and is not user-authored content.

### Fix

**File: `src/components/appointments/ParsedIntakeInfo.tsx` (lines 948-951)**

Add a regex to the existing cleaning chain that strips OON system messages like "These insurance plans are not accepted at this clinic: [Provider]." from the `insurance_notes` before display.

The existing code already strips insurance card URLs. We add one more `.replace()`:

```typescript
const cleaned = raw
  .replace(/Upload\s+A\s+Copy\s+Of\s+Your\s+Insurance\s+Card:\s*https?:\/\/\S+/gi, '')
  .replace(/https?:\/\/services\.leadconnectorhq\.com\/documents\/download\/\S+/gi, '')
  .replace(/These insurance plans are not accepted at this clinic:\s*[^.]*\.?\s*/gi, '')
  .trim();
```

This preserves the user's actual note ("TEST note section") while removing the injected OON warning. The regex is flexible enough to handle any provider name after the colon.

### Scope
- Single file edit, display-only change
- No backend or edge function changes needed
- The OON message will still be stored in the database for audit purposes, just not shown in the Notes display

