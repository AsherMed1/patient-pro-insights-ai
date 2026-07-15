## Why Jovita Dodson (f703ec9d) shows almost no info

**Root cause:** The record parsed successfully (`parsing_completed_at = Jul 12, 2026 14:42:27 UTC`, ~2 seconds after creation), but the AI extraction returned mostly nulls even though the raw `patient_intake_notes` contain the full GHL contact dump.

What actually got populated:
- Contact block: name, phone, email, DOB, address ✅
- Demographics: DOB 1956-08-26, age 69 ✅
- Pathology: only `procedure_type: GAE` and `affected_side: Both` ✅
- **Insurance: all null** ❌ (raw notes clearly show "United Healthcare Medicare", ID `9491348931`, plan "United Health care")
- **Pathology detail: duration, symptoms, pain level, treatments, imaging_done — all null** ❌ (raw notes have all of them under "GAE STEP 1/2")
- **Medical info: PCP name/phone/imaging — all null** ❌ (raw notes name Dr. Sherri Graham + address + phone)

So it's not a display bug and it's not a missing-webhook bug — the enrichment pass silently dropped fields the raw notes explicitly contain. This is the same class of failure we saw on VSAV Test before we added the deterministic `affected_side` regex fallback: the model returned null for a field that was present verbatim.

**Note on missing date/time:** that part is expected — Premier Vascular is on unscheduled-capture, so Morning/Afternoon time preference is correct (`time_preference = morning` is already set). The "no info" complaint is about the empty Medical Information card, not the missing date.

## Plan

1. **Immediate fix for Jovita** — call `reparse-specific-appointments` for `f703ec9d-20f5-4353-9d37-c086fff86d1f` so the AI parser re-runs with the current schema. If a second pass still misses insurance/pathology, backfill her row directly from the raw notes we already have.

2. **Diagnose why the first parse dropped fields** — pull the `auto-parse-intake-notes` edge function logs for `2026-07-12 14:42:27Z ± a few seconds` and confirm whether:
   - the model returned nulls (needs stronger prompt / deterministic regex fallbacks), or
   - the response was truncated / rate-limited (needs retry logic), or
   - the "Patient Intake Summary" blob sanitization consumed the labels (known failure mode already in memory).

3. **Category fix, not just this row** — sweep Premier Vascular records created in the same window where `patient_intake_notes` contains "Please select your Primary insurance provider" but `parsed_insurance_info.insurance_provider IS NULL`, and re-queue them for reparse. Same sweep for `GAE STEP` present + `parsed_pathology_info.duration IS NULL`. This mirrors the Ozark Affected Side backfill we just ran.

4. **Add deterministic regex enrichment** in `auto-parse-intake-notes` for the fields that failed here (insurance provider/plan/ID, pain level, duration, symptoms, treatments, PCP name/phone) so a null from the model is patched from the raw text before write, matching the pattern we already use for `affected_side`.

No schema changes. No UI changes beyond what reparse produces.

## Deliverable order

1. Reparse Jovita → verify her card populates.
2. Log check + backfill sweep for the same-window Premier records.
3. Add regex fallbacks to `auto-parse-intake-notes` so this stops recurring.

Want me to proceed with all three, or just fix Jovita for now and come back to the sweep + parser hardening separately?