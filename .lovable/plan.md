# Fix: PCP Name missing when GHL splits it into two labeled fields

## Root cause

For appointment `1c80bc60…` (Test Johann Booked, Everest Vascular), the GHL intake notes contain **two separate** Primary Care lines:

```
Primary Care Doctor's Phone Number: 3241231412
Primary Care Doctor's Name: dr sdfa
```

The parser's PCP-backfill regex in `supabase/functions/auto-parse-intake-notes/index.ts` is `/Primary Care[^:\n]*:\s*([^\n|]+)/i`, which matches the **first** matching line (the Phone one). It then:

1. Strips the digits into `pcp_phone` (correct: `3241231412`).
2. Sets `pcp_name` to what's left after the strip — an empty string.

Result: `parsed_medical_info = { pcp_name: "", pcp_phone: "3241231412", … }` and the UI shows PCP Phone but no PCP Name, even though "dr sdfa" is right there in the raw notes.

The same greedy regex appears in three places in `auto-parse-intake-notes/index.ts` (approx. lines 699–716, 936–955, and 1132–1147).

## Fix

1. **Parser (`supabase/functions/auto-parse-intake-notes/index.ts`)** — update all three PCP-backfill blocks so they:
   - Try a **Name-specific** pattern first: `/Primary Care[^:\n]*Name[^:\n]*:\s*([^\n|]+)/i` (also accept `PCP ... Name`), and if it matches, use that value for `pcp_name` only (never touch `pcp_phone` from a Name line).
   - Only fall back to the generic `/Primary Care[^:\n]*:\s*([^\n|]+)/i` when no Name-labeled line exists, and in that fallback **skip lines whose label contains "Phone" / "Number" / "Tel"** so a phone-only line can't be misread as a name.
   - After extraction, if the resulting `pcp_name` is empty/whitespace, leave it `null` instead of storing `""` (empty strings currently poison the "already parsed" check).
   - Keep the existing separate `pcp_phone` backfill (lines ~1150–1160) — it already handles the Phone line correctly.

2. **Backfill this record** — trigger a re-parse of appointment `1c80bc60-d9cb-46eb-82ab-1aecbca39808` so the corrected parser writes `pcp_name: "dr sdfa"` into `parsed_medical_info` (and also into the top-level column if the field-sync logic mirrors it).

3. **Optional sanity sweep** (only if you want it now) — run the same re-parse across appointments where `parsed_medical_info->>'pcp_phone' IS NOT NULL AND (parsed_medical_info->>'pcp_name' IS NULL OR parsed_medical_info->>'pcp_name' = '')` and the raw `patient_intake_notes` contain a `Primary Care ... Name:` line. Let me know if you want this in the same pass or skipped.

## No changes to

- UI rendering of the Medical & PCP Information card — the card already shows PCP Name when present.
- GHL-JSON key-based extractor (lines ~2033–2064) — it already handles Name vs Phone keys correctly; the bug is strictly in the text-regex fallback.
- Other medical fields (allergies, medications, imaging).

## Verification

- Re-parse the Test Johann record and confirm the card shows `PCP Name: dr sdfa` alongside `PCP Phone: 3241231412`.
- Spot-check one Ally / Everest / Champion record that previously had both PCP name and phone to confirm no regression.
