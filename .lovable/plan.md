## Issues

**1. Duplicate "Duration" in Medical Information**
`src/components/appointments/ParsedIntakeInfo.tsx` renders `parsedPathologyInfo.duration` twice:
- Line 781 (top of section, always shown)
- Line 940 (further down, also always shown — originally intended for a different procedure branch but not gated)

Result: PFE (and any other procedure) shows Duration twice.

**2. Imaging info missing the rich free-text field**
The intake notes for VSA TEST contain two imaging fields:
- `PFE STEP 2 | Have you had any imaging or tests...: Yes, MRI` → parsed as `imaging_details = "Yes, MRI"`
- `Had Imaging Before?: MRI 2 weeks ago in May at Vascular Surgery Associates clinic in Ellicott` → **ignored**

The parser (`supabase/functions/auto-parse-intake-notes`) only looks at the STEP question, so `imaging_when`, `imaging_location`, and `imaging_facility` are never populated, and the UI shows the truncated "Yes, MRI" instead of the full description.

## Fix

### Frontend — `src/components/appointments/ParsedIntakeInfo.tsx`
- Remove the duplicate Duration block at lines 940–945. Keep the original at lines 781–785.

### Parser — `supabase/functions/auto-parse-intake-notes/index.ts`
- Add `Had Imaging Before?:\s*([^\n|]+)` to the regex/imaging patterns and to the OpenAI prompt as a high-priority source for `imaging_details`.
- Prefer the longer/richer of the two values when both exist (i.e., when "Had Imaging Before?" has more than ~15 chars, use it as `imaging_details` and run `parseCompoundImagingResponse` on it to extract `imaging_type`, `imaging_location`, `imaging_when`).
- The existing compound regex already handles "at Vascular Surgery Associates clinic" (matches `Associates`) and date phrases like "2 weeks ago" / "in May".

### Reparse VSA TEST
- Invoke `reparse-specific-appointments` for appointment id `a897f0dd-6215-49ca-aa9d-05cf829b21f1` so the Medical & PCP card immediately shows: Imaging Type MRI, Imaging When "2 weeks ago in May", Imaging Location "Vascular Surgery Associates clinic", Imaging Details full sentence.

## Out of scope
- No DB schema changes.
- No changes to other procedures' field visibility.
