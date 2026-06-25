## Problem

For Judith Vroegindewey (NVVI), the GHL intake had a multi-line "Notes" block:

```
Secondary Insurance - 000997964-02 TriCare
I also have carpal tunnel (again, had surgery years ago) and arthritis which includes trigger finger. I sometimes get leg cramps in my left leg at night. My toes hurt more in the daytime and I try to help them using my implanted back stimulator.
```

The portal only shows the first line ("Secondary Insurance - 000997964-02 TriCare"). All subsequent lines are dropped before they ever reach the UI.

## Root cause

In `supabase/functions/auto-parse-intake-notes/index.ts` (lines 961–983), the regex fallback that extracts the generic `Notes (Example: ...)` field uses `[^\n]+`, so it only captures the first line:

```ts
/Notes\s*\(Example:.*?\).*?:\s*([^\n]+)/i
/Notes\s*\(.*?optional.*?\).*?:\s*([^\n]+)/i
/^  Notes.*?:\s*([^\n]+)/im
```

When the GHL intake renders the Notes field across multiple lines (free-form patient response), everything after the first `\n` is lost. The same `insurance_notes` value is what the UI renders as "Notes:" inside the Insurance Information card.

## Fix

1. **Update the regex fallback** in `auto-parse-intake-notes/index.ts` to capture the full multi-line block until the next labeled field (or end of section). Switch from `[^\n]+` to a lazy multi-line capture with a lookahead for the next known label:

   ```ts
   const NEXT_LABEL = /(?=\n\s*(?:[A-Z][A-Za-z /&()'-]{1,60}:|Upload\s|https?:\/\/|$))/;
   const notesPatterns = [
     new RegExp(String.raw`Notes\s*\(Example:.*?\).*?:\s*([\s\S]+?)` + NEXT_LABEL.source, 'i'),
     new RegExp(String.raw`Notes\s*\(.*?optional.*?\).*?:\s*([\s\S]+?)` + NEXT_LABEL.source, 'i'),
     new RegExp(String.raw`(?:^|\n)\s*Notes\s*:\s*([\s\S]+?)` + NEXT_LABEL.source, 'i'),
   ];
   ```

   Then trim and collapse leading/trailing whitespace, but preserve internal newlines (we'll render them as soft breaks in the UI). Keep the existing single-line patterns as a final fallback if the multi-line match fails.

2. **Preserve newlines on display** in `src/components/appointments/ParsedIntakeInfo.tsx` (around line 1145) by adding `whitespace-pre-wrap` to the rendered notes span so the captured multi-line text is readable.

3. **Re-parse the affected record** with a one-off migration (or trigger reparse via the existing reparse function) so Judith Vroegindewey's `insurance_notes` is refreshed from the current raw intake notes. This will require approval since it runs SQL/edge logic.

## Files changed

- `supabase/functions/auto-parse-intake-notes/index.ts` — multi-line Notes capture
- `src/components/appointments/ParsedIntakeInfo.tsx` — `whitespace-pre-wrap` on the Notes value

## Out of scope

No UI restructuring, no schema changes, no changes to the Insurance Card upload flow. Only the Notes capture/display.
