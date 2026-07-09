## Goal

Capture the new GHL intake question — "Which side is affected by the condition you are seeking treatment for?" (Left / Right / Both) — and surface it in the Medical Information card of every appointment, regardless of project or procedure type.

## Why current code misses it

- The intake key on Johann's record is `GAE STEP 1 | Which side is affected by the condition you are seeking treatment for?: Both`. Its answer is `Both` (no "knee" in the value).
- In `auto-parse-intake-notes/index.ts` the "affected" branch (line 1903) writes `affected_area = "Both"` — a nonsense value — and the knee-side branch (line 1918) only fires when the key contains `knee`. So `affected_knee` / `affected_area` stay null, and nothing is displayed.
- The UI already has an `Affected Knee` row but it's gated to `procedure_type === 'GAE'` (line 1039), so even if we forced knee mapping it wouldn't cover PAE, UFE, HAE, PAD, Neuropathy, etc.

## Changes

### 1. Parser — `supabase/functions/auto-parse-intake-notes/index.ts`

- Add a new pathology field `affected_side: 'Left' | 'Right' | 'Both' | null` to the parsed pathology schema (initialised alongside `affected_area` / `affected_knee` in every result scaffold — ~lines 489, 884, 1716).
- Add the field to the OpenAI JSON schema block (line ~2540) with description: `"'Left', 'Right', or 'Both' — extract from any 'Which side is affected...' question, applies to all procedures."`
- In the GHL key/value loop, insert a new branch BEFORE the existing `key.includes('affected')` branch that matches keys containing `which side` OR (`side` AND `affected`). Normalise the answer to `Left` / `Right` / `Both` (bilateral → Both) and write to `pathology_info.affected_side`. Do NOT overwrite `affected_area` from this question.
- Fix the existing "affected/area/location" branch (line 1903) so it skips values that are just `Left` / `Right` / `Both` / `Bilateral` (prevents the current bug where `affected_area` gets set to `"Both"`).
- For GAE specifically, keep the existing `affected_knee` mirror so the current knee-only badge continues to work.

### 2. UI — `src/components/appointments/ParsedIntakeInfo.tsx`

- In the Medical Information card, add a new row rendered for **all** procedures whenever `parsedPathologyInfo.affected_side` is present:

  ```
  Affected Side:  [Left | Right | Both]  (badge, amber)
  ```

  Place it directly above the existing `Affected Knee` / `Affected Shoulder` rows (~line 1038) so it's the primary display; the GAE-only "Affected Knee" and FSE-only "Affected Shoulder" badges remain as procedure-specific detail.

### 3. Backfill

- Reparse the sample lead `b7483ab5-8973-4db8-b101-ce6c92c3d02f` (Test Johann Booked) via `reparse-specific-appointments` to verify `affected_side = 'Both'` populates and the badge renders.
- No mass backfill required — future GHL webhooks will populate the field naturally; the same edge function auto-parses new records. If you want, I can add an optional one-time sweep that reparses appointments whose `patient_intake_notes` contain "which side is affected" but whose `parsed_pathology_info.affected_side` is null. (Say the word and I'll include it.)

## Safety

- Purely additive: new JSON field + new UI row. No existing field is renamed, removed, or repurposed.
- The bug-fix to the `affected_area` branch only prevents nonsense values (`"Both"`, `"Left"`, `"Right"`, `"Bilateral"`) from being stored there — real anatomical values (`Uterus`, `Prostate`, `Achilles tendon`, `Knee`, etc.) are unaffected.
- No DB migration, no schema change (JSONB), no changes to webhook routing, status logic, or the notes-sync branch.
- Rollback = revert the two file edits.

## Out of scope

- No changes to Patient Intake Notes raw view, Insurance section, status routing, or GHL sync.
- No new dashboard filters based on affected side (can be a follow-up if useful).
