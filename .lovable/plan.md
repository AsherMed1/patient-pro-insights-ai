# Fix: ATE procedure not detected → Medical Information card empty

## Root cause

The Medical Information (amber) card you screenshotted shows only Pain Level because **ATE is not registered as a procedure** anywhere in the parser:

1. `detectProcedureFromCalendar` (`supabase/functions/auto-parse-intake-notes/index.ts:2027`) has branches for UFE / PAE / GAE / PFE / PAD / FSE / HAE / TAE / Neuropathy — **no ATE / Achilles**. So a calendar named "Request Your ATE Consultation - Libertyville, IL" returns `null`.
2. With `calendarProcedure = null`, the AI prompt gets no procedure context, so `procedure_type`, `duration`, `symptoms`, `previous_treatments`, etc. all stay null → the card collapses to just Pain Level + Notes.
3. JVI's only ATE pathology answers in GHL today are:
   - `STEP 1 | How would you rate your pain on a scale of 0–10?: 5` → pain_level (already populates)
   - `STEP 1 | Where is your pain located?: Middle of the Achilles tendon` → not currently mapped to any structured field

(The teal **Medical & PCP Information** card lower on the page is a separate section — that's the one where Imaging Type / Details / When / Location now correctly populate after the prior fix.)

## Fix

### 1. Register ATE as a procedure (parser)
File: `supabase/functions/auto-parse-intake-notes/index.ts`

- **`detectProcedureFromCalendar`**: add an ATE branch matching `ate` (word boundary) or `achilles`/`tendinitis`/`tendonitis` so all variants of the calendar name resolve to `'ATE'`.
- **AI prompt context block (~line 2369)**: add an `ATE` branch describing the procedure (Achilles Tendinitis Embolization — focus on Achilles tendon pain, location of pain, pain level, duration, prior treatments). Map:
  - `STEP 1 | Where is your pain located?` → `pathology_info.affected_area` (and primary_complaint = "ATE Consultation").
  - `STEP 1 | How would you rate your pain on a scale of 0–10?` → `pathology_info.pain_level`.
  - Set `procedure_type = "ATE"`.
- **Constraints / mapping**: confirm Joint & Vascular Institute has no procedure-restriction list that would override ATE. (Quick scan; will leave alone if it's permissive.)

### 2. UI — surface ATE-recognized fields
File: `src/components/appointments/ParsedIntakeInfo.tsx`

The amber Medical Information card already renders `procedure_type`, `pain_level`, `affected_area`, `previous_treatments`, `duration`, `primary_complaint` generically — once the parser populates them, they'll appear automatically. **No new render branches needed** for ATE specifically; existing generic rows cover it. (If we later want an "Affected Tendon" badge, that would be additive.)

### 3. Reparse the JVI Test record
After deploying, set `parsing_completed_at = NULL` on `40a3a211-...` and call `auto-parse-intake-notes` so the user can confirm in the portal.

## Out of scope

- "ATE Survey Fields" custom card (slides 1, 6, etc.) — still blocked on you/Marissa mapping the missing slide answers to GHL custom fields. Once GHL sends them, we can add an ATE-specific block similar to UFE's.

## Verification

After deploy + reparse, JVI Test (id `40a3a211-1468-424c-ab8b-d70b275602ba`) should show in Medical Information:
- Pathology: ATE
- Primary Complaint: ATE Consultation
- Pain Level: 5/10
- Affected Area: Middle of the Achilles tendon
