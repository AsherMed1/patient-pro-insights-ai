# DONOTCONTACT TESTLEAD (01d35a48) — why Medical Information is nearly empty

## What the record actually contains

Parsing did run and did succeed: `parsing_completed_at` is set (Aug 25, 12:02 UTC), `parse_attempts = 0`, intake notes are 1,561 characters, and the medical/PCP data was extracted:

- `parsed_medical_info` = `{ pcp_name: "Dr Luis Test", pcp_phone: "0935350344", imaging_details: "Yes" }`
- `parsed_pathology_info` = `{ procedure_type: "PAD" }` — nothing else

The amber "Medical Information" card renders the **pathology** object (duration, pain level, symptoms, prior treatments, affected side). GHL sent none of those fields for this contact — the full GHL custom-field dump in the intake notes contains only contact, insurance, PCP name/phone, "Had Imaging Before?: Yes", and tracking fields. There is no STEP/symptom/duration/pain data to parse, so the card correctly shows only `Pathology: PAD`.

Cause: this is a manually created test contact in AVA Vascular (`AI Status: AI Off`) where the PAD intake questions were never answered. Not a parser failure — no data was lost.

## One real bug found

`extractPcpNameAndPhone` in `auto-parse-intake-notes` uses a strict 10-digit US phone pattern:

```text
/(\(?\d{3}\)?[.\-\s]?\d{3}[.\-\s]?\d{4})/
```

The GHL value is `09353503443` (11 digits), so it matched the first 10 and stored `0935350344` — the last digit is silently dropped. This affects any PCP phone with a leading 0, an 11-digit number, or an extension.

## Proposed work

1. **Fix the PCP phone truncation.** Match the whole digit run at a label boundary instead of exactly 10 digits: capture the raw value after the `Primary Care Doctor's Phone Number:` label up to the line/`|`/`;` break, keep the original formatting, and only fall back to the 10-digit pattern for free-text notes. Reject values that are clearly not phones (letters, >15 digits).
2. **Re-parse this record** afterwards so its PCP phone shows the full `09353503443`.
3. **Make the empty state honest.** When `parsed_pathology_info` has only `procedure_type` and the intake notes contain no pathology answers, show a small muted line in the Medical Information card: "No intake pathology answers were submitted for this patient" — so staff can tell "clinic never collected it" apart from "the portal failed to parse it".

## Technical notes

- Edit `supabase/functions/auto-parse-intake-notes/index.ts` (`extractPcpNameAndPhone`, ~line 53-110). Also mirror the phone-normalisation change wherever `pcp_phone` is validated (`isUnusablePcpValue` path).
- Re-parse via the existing `auto-parse-intake-notes` invocation for appointment `01d35a48-2ba6-4c8e-9ded-d8140e34e15b`.
- UI change is limited to the Medical Information block in `src/components/appointments/ParsedIntakeInfo.tsx` (~line 1228).
- No schema changes.

Separately: the `DOB needs verification (GHL: 2026-08-01)` badge is the existing implausible-DOB guard working as designed — GHL really does hold `2026-08-01` for this contact, so the DOB stayed null rather than being written as a newborn. No change proposed there.
