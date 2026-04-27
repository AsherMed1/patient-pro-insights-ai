## Issue

Joint & Vascular Institute (and 19 other clinics) have appointments where the **Insurance Group Number is being copied into the Member ID field**, even though GHL has both values correctly.

## Root Cause

The auto-parse-intake-notes edge function has two parsing paths:
1. **Primary**: OpenAI structured extraction (works correctly).
2. **Fallback**: Regex-based extraction, used when OpenAI returns 429 (rate-limited) or fails.

This weekend OpenAI was rate-limited frequently, so the fallback ran. The fallback has two bugs in `fallbackRegexParsing()`:

- **Line 370 bug**: When a Group Number is found, the code writes the same value into BOTH `insurance_group_number` AND `insurance_id_number`:
  ```ts
  result.insurance_info.insurance_group_number = match[1].trim();
  result.insurance_info.insurance_id_number = match[1].trim();  // ← bug
  ```
- **Missing extraction**: The fallback has no regex for "Insurance ID Number" / "Member ID", so even without the line-370 overwrite the Member ID would never be populated by the fallback.

Confirmed example — Stacy Abron (Joint & Vascular):
- GHL notes say: `Insurance Group Number: JNY123M717` and `Insurance ID Number: ZTO7001795DK`
- Portal stored both as `JNY123M717`

Confirmed in logs: `[AUTO-PARSE] OpenAI rate limited (429), using regex fallback ...`

## Scope of Damage

- **127 of 221** appointments created since 2026-04-24 have `detected_insurance_id` equal to the parsed group number (very likely all wrong).
- Top affected: Richmond Vascular (14), NG Vascular (11), Texas Vascular (11), VSNC (10), Buffalo (8), Painless Center (8), Fayette (6), Joint & Vascular (3), and others.

## Plan

### 1. Fix the parser (`supabase/functions/auto-parse-intake-notes/index.ts`)

- Remove line 370 — do not assign group number to `insurance_id_number`.
- Add a Member ID regex block alongside the Group block:
  ```ts
  const memberIdPatterns = [
    /Insurance ID Number:\s*([^\n|]+)/i,
    /Member ID[#:]*\s*([^\n|]+)/i,
    /Member Number:\s*([^\n|]+)/i,
    /Insurance ID[#:]*\s*([^\n|]+)/i,
    /Subscriber ID:\s*([^\n|]+)/i,
    /Policy (?:Number|ID):\s*([^\n|]+)/i,
  ];
  ```
  Assign only to `insurance_info.insurance_id_number`.
- Order matters: extract Member ID before Group so the more-specific "Insurance ID Number" pattern wins; keep group regex anchored to "Group" tokens only.

### 2. Re-parse affected appointments

Run `reparse-specific-appointments` for the 127 weekend records where `detected_insurance_id = parsed_insurance_info->>'insurance_group_number'` and `date_appointment_created >= 2026-04-24`. The function already has OpenAI quota-retry logic, so duplicated bad data will be replaced with correct GHL values (or with the now-fixed fallback if OpenAI is still throttled).

### 3. Verify

- Spot-check Stacy Abron, Walter Par, Belinda Porras, Pierre Labounty after re-parse — confirm `detected_insurance_id` matches GHL "Insurance ID Number" and `group_number` matches GHL "Insurance Group Number" independently.
- Re-run the duplication SQL count; expect it to drop near zero.

### 4. Optional follow-up (not in this change unless requested)

- Add a structured-log alert when fallback parser runs more than N times/hour so we know when OpenAI quota issues recur.

## Files Changed

- `supabase/functions/auto-parse-intake-notes/index.ts` (edit fallback regex section, ~lines 359–374).
- One-shot data fix via existing `reparse-specific-appointments` edge function (no schema change).
