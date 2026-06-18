# Fix: "Had Imaging Before?" multi-line value truncation

## Bug

GHL field:
```
Had Imaging Before ?: Yes and x-ray.
24th August 2025 at Joint & Vascular Institute in Rockford
```

Portal shows only `Imaging Details: Yes and x-ray.` — the date/location line is dropped, and `Imaging Type: X-ray` is the only structured field that gets populated. `Imaging When` (24th August 2025) and `Imaging Location` (Joint & Vascular Institute in Rockford) are both empty because the parser never sees the second line.

## Root cause

In `supabase/functions/auto-parse-intake-notes/index.ts`, every "Had Imaging Before" extraction uses a single-line regex `[^\n|]+`:

- Line ~1026 backfill: `/Had Imaging Before\s*\??\s*:\s*([^\n|]+)/i`
- Line ~1885 GHL section parser: same single-line capture
- Line ~846 enrich pass: same

GHL embeds the answer's continuation as a literal newline inside the same field, so the regex stops at "Yes and x-ray." and the rest is lost before `parseCompoundImagingResponse` runs.

## Fix

1. **Add a multi-line capture helper** that, on encountering `Had Imaging Before ?:`, grabs the value plus any subsequent indented/non-empty continuation lines until the next `  Field Name:` line, blank line, or next section header (e.g. `Additional Information:`, `=== `).
2. **Use that helper in all three sites** (backfill on line ~1026, enrich on line ~846, and the GHL section walker on line ~1885) so the richest value is what hits `parseCompoundImagingResponse`.
3. **Keep existing sanitization** (`sanitizeImagingDetails` / 200-char + bot-keyword reject) intact — apply it to the joined multi-line value.
4. **Reparse the JVI Test ATE appointment** (id `40a3a211-1468-424c-ab8b-d70b275602ba`) so the user immediately sees the fix in the portal.

## Expected portal result after fix

```
Imaging Type:      X-ray
Imaging When:      24th August 2025  (or "August 2025")
Imaging Location:  Joint & Vascular Institute in Rockford
Imaging Details:   Yes and x-ray. 24th August 2025 at Joint & Vascular Institute in Rockford
```

## Scope

- One file edited: `supabase/functions/auto-parse-intake-notes/index.ts`
- One reparse call for the test appointment
- No DB migration, no UI changes (the UI already renders `imaging_when` / `imaging_location` when present)
