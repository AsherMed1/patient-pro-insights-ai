# Fix: UFE intake answers not populating + stale prior-service questions

## The problem (TEH TEST, id 77fe4b24)

The patient's GHL contact has these UFE funnel answers in Pathology:
- "UFE STEP 1 | How heavy are your periods?: Heavy..."
- "UFE STEP 1 | How often do you experience pelvic pain..."
- "UFE STEP 1 | Which best describes your menstrual cycle?: ..."

But `parsed_pathology_info` shows `symptoms: null, duration: null, pain_level: null` — only `procedure_type: UFE` was set. The parser has explicit extraction for GAE/PFE/PAD/TAE/HAE fields but **no extraction rules for UFE STEP 1 questions**, so the UI Pathology section has nothing to display.

Additionally, the same contact still carries a leftover `Neuropathy Step 2` answer from a prior GAE/Neuropathy opt-in, which clutters the raw intake notes and (under the wrong service) could mislead reviewers.

## Fix scope

Two coordinated changes, both inside the intake parsing pipeline + UI surfacing — no schema changes.

### 1. Extract UFE-specific funnel answers (`auto-parse-intake-notes`)

Add a UFE block to the regex enrichment phase (same place GAE/PAD/TAE blocks live):
- `period_heaviness` ← `UFE STEP 1 | How heavy are your periods?: …`
- `pelvic_pain_frequency` ← `UFE STEP 1 | How often do you experience pelvic pain…?: …`
- `menstrual_cycle` ← `UFE STEP 1 | Which best describes your menstrual cycle?: …`
- `period_length` ← `UFE STEP 1 | …Period Length…: …` (already seen in multi-procedure notes)
- Backfill `primary_complaint = 'UFE / Fibroids'` and `symptoms` as a joined summary of the above when individual fields hit, so existing UI that reads `symptoms` shows something useful.

Run only when `pathology_info.procedure_type === 'UFE'` (set earlier in the same function, line ~624).

### 2. Strip stale prior-service STEP answers on procedure switch

When the resolved `procedure_type` differs from the procedure implied by a STEP question, drop that line before persisting `patient_intake_notes` and before AI parsing:
- Detect pattern `^\s*(GAE|UFE|PAE|HAE|PAD|FSE|TAE|PFE|Neuropathy) STEP \d+ \|`.
- Keep only lines whose STEP prefix matches the current procedure (or has no STEP prefix).
- Re-write the cleaned block back to `patient_intake_notes` so the raw notes view (per the `procedure-aware-pathology-notes-display` memory) and the parser both see only relevant answers.

This handles the GAE→UFE re-opt-in case the user described: when the calendar / Service Name is UFE, the lingering `Neuropathy Step 2` / `GAE STEP n` answers are removed from this appointment's intake snapshot. (We do NOT mutate the GHL contact — only our stored snapshot.)

### 3. Display in UI (`ParsedIntakeInfo.tsx`)

Add a UFE conditional block in the Pathology section (mirroring the GAE knee / PAD blocks) that renders any of `period_heaviness`, `menstrual_cycle`, `pelvic_pain_frequency`, `period_length` when `procedure_type === 'UFE'`. Falls back gracefully if any field is null.

### 4. Backfill this record + any affected siblings

After deploy, call `reparse-specific-appointments` for:
- `77fe4b24-7e2a-45c0-b8fc-6c533a01ac9e` (TEH TEST)
- All `Texas Endovascular - Houston Vein Clinic` UFE appointments whose `parsed_pathology_info->>symptoms` is null but `patient_intake_notes` contains `UFE STEP 1`.

## Out of scope

- Two-way write back to GHL to actually delete the stale custom field on the contact (would need a GHL custom-field DELETE call per service; flag for future work if user wants it).
- Adding new DB columns — everything fits inside the existing `parsed_pathology_info` JSONB.

## Technical notes

Files touched:
- `supabase/functions/auto-parse-intake-notes/index.ts` — add UFE regex block (~line 870, after PAD block) and a `stripStaleStepLines(notes, procedure)` helper called before persisting notes.
- `src/components/appointments/ParsedIntakeInfo.tsx` — add UFE pathology rendering block.
- One-shot reparse trigger via existing `reparse-specific-appointments` edge function (no new code).

No migrations. No RLS changes. No new secrets.
