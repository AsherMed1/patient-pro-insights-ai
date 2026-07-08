
## What's happening

The screenshot is from the **Patient Intake Notes** panel inside the appointment card (`src/components/appointments/AppointmentCard.tsx`, lines 1918-1950). That panel renders `appointment.patient_intake_notes` as raw text with `whitespace-pre-wrap`.

GHL intake for these contacts contains **two overlapping fields**:

- `Primary Care Doctor's Name: Patricia E. Weaver, NP`
- `Primary Care Doctor's Name and Phone: PCP: Patricia E. Weaver, NP  8434792341`

Because we dump the notes verbatim, the doctor name shows twice and the phone is glued onto the second label instead of standing on its own. The user wants the phone visually separated.

We already extract `pcp_name` and `pcp_phone` cleanly into `parsed_medical_info` (shown at the top of the intake panel via `ParsedIntakeInfo.tsx`), so this is purely a **display cleanup** on the raw notes block. No parser, webhook, or DB change.

## Fix

Extend the existing text sanitizer used before rendering `patient_intake_notes` (`stripAIPrompt` in `AppointmentCard.tsx`) — or add a small sibling helper `normalizePcpBlock` — that:

1. Finds any `Primary Care Doctor's Name and Phone:` line (curly + straight apostrophe safe, case-insensitive).
2. Splits its value into a name portion and a phone portion:
   - Strip a leading `PCP:` prefix.
   - Extract the last phone-like token: `/(\+?\d[\d\s().-]{7,}\d)\s*$/`.
   - Name = value with that phone stripped and trimmed of trailing punctuation.
3. Replaces the single combined line with two clean lines:
   ```
   Primary Care Doctor's Name: Patricia E. Weaver, NP
   Primary Care Doctor's Phone: 8434792341
   ```
4. If a plain `Primary Care Doctor's Name:` line already exists earlier in the notes with the same name (case-insensitive, punctuation-insensitive), drop the duplicated name line produced in step 3 and keep only the `Primary Care Doctor's Phone:` line so the name isn't shown twice.
5. If no phone is found in the combined line, leave the original line untouched (safe no-op).

## Where the change lives

- `src/components/appointments/AppointmentCard.tsx`
  - Add helper `normalizePcpBlock(notes: string): string` next to `stripAIPrompt`.
  - Update line 1945 render to `{normalizePcpBlock(stripAIPrompt(appointment.patient_intake_notes))}`.

No other components render `patient_intake_notes` raw in a way the user sees this label pattern (verified via `rg`), so the fix is scoped to that one call site.

## Out of scope

- No changes to `parsed_medical_info` writes, no migrations, no changes to `ParsedIntakeInfo.tsx` (its `PCP Name` / `PCP Phone` rows are already separated and correct).
- No change to GHL intake templates — we treat GHL data as-is and sanitize on display.

## Verification

1. Open an appointment whose `patient_intake_notes` contains both `Primary Care Doctor's Name:` and `Primary Care Doctor's Name and Phone:` lines (e.g., the Patricia E. Weaver record in the screenshot).
2. Expand "Patient Intake Notes" and confirm the combined line is replaced with a standalone `Primary Care Doctor's Phone: 8434792341` line and no duplicate name.
3. Open an appointment whose notes only contain the combined line (no separate name line) and confirm both name and phone appear on their own lines.
4. Open an appointment with neither field and confirm the notes render unchanged.
