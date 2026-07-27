## What's wrong

Lurshune Martin (Davis Vein & Vascular, d4e86ff9) shows PCP Name and PCP Phone both set to:

`Not Collected; Preferred Location: Houston; Preferred Appointment Time: Afternoon; Follow-Up Notes: Patient recently changed insurance to WellPoint...`

The real values are in his GHL intake notes under Medical Information:
- Primary Care Doctor's Name: **Dr. David Gould**
- Primary Care Doctor's Phone Number: **2818906446**

## Root cause (confirmed from the stored record)

His notes contain a single-line GHL "Notes (Example: Imaging, Secondary, etc.)" blob with semicolon-separated pairs, including `PCP Name/Phone: Not Collected; Preferred Location: Houston; ...`.

The PCP extractor in `auto-parse-intake-notes` matches the first `(?:Primary Care|PCP)...Name...:` occurrence and captures everything up to the next newline or `|`. Since the blob is one long line with `;` separators, it swallowed the entire rest of the blob — and it matched the blob before reaching the correct `Primary Care Doctor's Name: Dr. David Gould` line further down.

## Fix

1. **Harden `extractPcpNameAndPhone`** in `supabase/functions/auto-parse-intake-notes/index.ts`:
   - Stop captured values at `;` as well as newline and `|`, so semicolon-separated blobs can't bleed into the next label.
   - Add `not collected`, `not provided`, `no pcp`, `none provided` to the rejected-value list (`isBad`), so a placeholder never fills the field.
   - Prefer explicitly labeled `Primary Care Doctor's Name` / `Phone Number` lines over any match found inside a "Notes (...)" blob: scan all candidate matches, take the first non-placeholder one, rather than the first match outright.
   - Add a final guard so any resulting name/phone longer than ~60 chars or containing a second `:` label is discarded as a bad slurp.

2. **Same guard on the merge step** so a placeholder value in the notes can't overwrite a good value extracted from GHL's dedicated `Primary Care Doctor's Name` / `Primary Care Doctor's Phone Number` custom fields.

3. **Repair Lurshune Martin's record**: set `parsed_medical_info.pcp_name = "Dr. David Gould"` and `pcp_phone = "2818906446"` via a data update.

4. **Backfill sweep**: find other appointments whose `parsed_medical_info->>pcp_name` starts with `Not Collected` or exceeds 60 characters, and re-derive their PCP from the dedicated intake-note lines where present (null it out where not).

## Technical notes

- Only the extraction helper and its two enrichment call sites change; the AI prompt and the rest of the parser are untouched.
- No UI change needed — `ParsedIntakeInfo.tsx` renders whatever is in `parsed_medical_info`.
