# Fix wrong Medical Information for Veronica Hill (Davis Vein & Vascular)

Two separate defects show up on this record. Both are confirmed against the stored data.

## 1. Pain Level (6) is being thrown away

Her GHL intake clearly contains:

```text
GAE STEP 2 | On a scale of 1-10 how severe is your pain?: 6
```

but the saved record has no pain level, so the card shows no Pain Level row.

Cause: the GAE parser correctly reads `6` from the pain-scale line, then runs a "is this actually a phone number?" safety check that scans the *entire* intake text for the pattern `6` followed by `-`, `.` or `)` and another digit. Her notes contain dates like `2026-08-20` ("6-0"), so the guard fires and deletes a perfectly valid answer. Any pain level that happens to appear next to a hyphen anywhere in the text is silently dropped — with the year 2026 in almost every record, digit `6` is hit constantly. 1,053 appointments in the last 180 days have a pain-scale answer in their raw notes but no stored pain level.

Fix: trust the value when it was read directly from the pain-scale question line — only apply the phone-shape guard to values the AI produced without that line, and tighten the guard so it only matches real phone groupings (three digits, e.g. `(936)`, `936-2250`), never a single digit.

## 2. The "Notes" line is a placeholder checklist

The card's Notes line prints:

```text
Concern: Not Collected; Duration: Not Collected; Symptoms: Not Collected; ... Follow-Up Notes: Call me back.
```

This is the setter form's template blob stored in the insurance notes field. Every entry except the last is the literal placeholder "Not Collected" — it contradicts the real answers shown right above it (Duration 1-6 months, Symptoms Dull Ache, Treatments Injections) and makes the record look empty.

Fix: strip placeholder segments. Split the notes on `;`, drop any segment whose value is "Not Collected" / "Not collected" / "N/A" / "None collected", and re-join the survivors. Veronica's line becomes:

```text
Follow-Up Notes: Call me back.
```

If nothing survives, the Notes line is hidden entirely. Applied in two places so it fixes old and new records: in the display card (immediate effect on all existing records) and in the parser before saving (so the junk is never stored again). 38 records in the last 180 days currently carry this placeholder text.

## 3. Backfill

Re-run parsing for appointments whose raw notes contain a GAE/ATE pain-scale answer but whose stored pain level is blank, and clean stored placeholder notes text, so existing records — starting with Veronica Hill — fill in without waiting for a new booking. Done in batches to stay inside edge-function limits; nothing else on those records is overwritten.

## Technical notes

- `supabase/functions/auto-parse-intake-notes/index.ts` ~2200-2225: keep a `fromScaleLine` flag from the `pl` grab; apply `inPhoneShape` only when `!fromScaleLine`, and change the pattern to require a 3-digit group (`\(\s*\d{2}${raw}\s*\)` style / `\d{2}${raw}\s*[-.]\s*\d{3}`) instead of the bare value. Range clamp 0-10 stays.
- Same file, insurance-notes assignment path (~1446, ~2582) plus the existing `stripSecondaryInsuranceEcho` step (~1609): add a `stripNotCollectedSegments` helper and run it there.
- `src/components/appointments/ParsedIntakeInfo.tsx` ~1628-1660: add the same segment filter to the `insurance_notes` cleanup pipeline; return null when nothing remains.
- Backfill via the existing reparse edge function, scoped to `is_superseded IS NOT TRUE` and `created_at > now() - interval '180 days'`.

## Verification

Veronica Hill's card should show `Pain Level: 6/10` and either no Notes line or only `Follow-Up Notes: Call me back.`, with all other fields unchanged. Spot-check a few other GAE records for correct pain values and no regressions.
