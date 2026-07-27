## What I confirmed

Johnny Watkins (`0a8fa2f4`, Davis Vein & Vascular) has complete intake notes stored — BCBS, Insurance ID `ZGP848193628`, Group `469951`, plan "Blue cross blue shield", full GAE pathology STEPs, PCP "Watkins" / 409 316 9085, DOB 1963-10-19 — but all three parsed objects are all-null shells, and `parsing_completed_at` is stamped, so the parser treats the record as done and never retries. That is why the Insurance, Medical, and Medical & PCP cards render empty.

**87 appointments in the last 90 days** share this exact condition (insurance present in notes, parsed insurance ID null, `parsing_completed_at` set) across 26 projects, most recently 2026-07-27. About 7,100 records with identical note formatting parsed fine, so this is an intermittent ~1.2% failure, not a format problem. The precise per-record cause (OpenAI error vs. empty completion vs. fallback miss) can't be recovered from the database — July logs are gone — so reproducing it is step 1.

## Plan

**1. Reproduce and pin the failure**
Clear `parsing_completed_at` on Johnny Watkins, re-run `auto-parse-intake-notes` for him, and read the function logs to identify which branch produced the empty payload. Steps 3-4 get adjusted to whatever the logs show.

**2. Repair Johnny Watkins only, then hand over the full list**
Repair only `0a8fa2f4` for now and confirm his three cards populate. Then produce the complete list of the 87 affected appointments — patient name, project, created date, current status, and portal ID — as a CSV in the documents area plus a summary in chat, so they can be reviewed one by one before any bulk repair. **No bulk data change happens in this step.** (Preview of what's in it: Fayette Surgical Associates 9, NG Vascular 11, Georgia Endovascular 6, Texas Endovascular Houston 6, ECCO 5, Champion Heart 5, Zenith 5, plus 20 other projects. Several are already Cancelled / OON / test records.)

**3. Make an empty parse never look "complete"**
In `supabase/functions/auto-parse-intake-notes/index.ts`, extend the existing empty-result guard: if after the AI result and regex fallback are merged the insurance + medical + pathology sections are all still empty *while* the notes clearly contain `Insurance Information:` / `Pathology Information:` / `Medical Information:` sections, write the record **without** stamping `parsing_completed_at` and log it as an error, so the next scheduled sweep retries. Add a bounded retry counter so a genuinely unparseable record can't loop forever.

**4. Deterministic GHL-section extractor as first pass**
The `=== GHL Contact Data (Full) ===` block uses fixed labels (`Insurance ID Number:`, `Insurance Group Number:`, `Insurance Plan:`, `Please select your insurance provider:`, `Primary Care Doctor's Name` / `Phone Number:`, `GAE STEP n | …`). Extract those pairs directly before any AI call and treat them as highest-priority; the AI then only fills gaps. This makes insurance, PCP, and STEP pathology immune to AI outages, mirroring how the GHL webhook already lifts insurance from custom fields.

**5. Ongoing self-healing sweep**
Add the same "rich notes but empty parse" condition as a periodic check inside the existing parse job, so future stragglers repair themselves instead of needing a manual report.

## Safety

- Extraction only ever **fills** fields that are currently null — nothing already populated (by AI, by the GHL webhook, or by a manual portal edit) gets overwritten, so the 7,100 records parsing correctly today are untouched.
- No schema change, no UI change, no trigger change. `trigger_auto_ai_parsing` keeps working as-is.
- The retry-instead-of-stamp change only applies on the empty-payload path; successful parses stamp exactly as they do now.
- Bulk repair of the other 86 records is deferred until the list is reviewed and approved.
