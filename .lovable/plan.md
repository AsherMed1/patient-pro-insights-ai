# AVA Insurance Not Syncing to Portal — Root Cause & Fix

## What's actually happening

Insurance data **is** being captured correctly in the database for AVA appointments. I verified Darlene Taylor (Vascular Surgery Associates — same code path) and the last 8 AVA appointments. All have `parsed_insurance_info.insurance_provider`, `insurance_plan`, and `insurance_id_number` populated, plus matching `detected_insurance_*` columns. The portal UI reads those fields correctly.

The problem is **timing / reliability of background enrichment**, not field mapping.

### Smoking gun
`Eric Kilpatrick` (AVA): created `2026-05-16 18:44`, but `parsing_completed_at = 2026-05-18 15:30`. That's a 2-day gap — meaning the insurance card stayed empty in the portal for two days until somebody manually re-ran parsing. Most appointments parse in ~3 seconds; a subset never parse until manually retriggered. That matches what Jenny is seeing.

### Why it happens

`supabase/functions/ghl-webhook-handler/index.ts` does the heavy work in fire-and-forget background tasks that are **not** wrapped in `EdgeRuntime.waitUntil()`:

- Line 303: `enrichAppointmentWithGHLData(...)` — fetches full GHL contact (insurance fields live here), writes `patient_intake_notes`, then calls `triggerAutoParse` which populates `parsed_insurance_info`.
- Line 317: `fetchAndUpdateInsuranceCard(...)` — fetches `insurance_id_link`.
- Line 1121 / 1444: `triggerAutoParse(...)` — invokes `auto-parse-intake-notes`.

The webhook returns its 201 immediately. The Supabase Edge Runtime is free to terminate the worker as soon as the response is sent, killing any unfinished promise. When that race is lost, enrichment never completes → `parsed_insurance_info` stays null → portal shows the empty Insurance card Jenny screenshotted. This violates the project's existing rule (memory: "Use `EdgeRuntime.waitUntil()` … for tasks exceeding 60s timeout") — but the rule needs to apply to **any** background promise we want guaranteed, regardless of duration.

## The fix

Edit only `supabase/functions/ghl-webhook-handler/index.ts`:

1. Wrap the three background calls so the runtime keeps the worker alive until they resolve:
   ```ts
   // line ~303
   EdgeRuntime.waitUntil(
     enrichAppointmentWithGHLData(supabase, appointmentRecord.id, webhookData.ghl_id, webhookData.project_name, requestId)
   )
   // line ~312
   EdgeRuntime.waitUntil(triggerAutoParse(supabase, appointmentRecord.id, requestId))
   // line ~317
   EdgeRuntime.waitUntil(
     fetchAndUpdateInsuranceCard(supabase, appointmentRecord.id, webhookData.ghl_id, webhookData.project_name, requestId)
   )
   ```
2. Inside `enrichAppointmentWithGHLData`, change the trailing `triggerAutoParse(...)` (line 1444) to `await triggerAutoParse(...)` (and make `triggerAutoParse` return its promise) so the enrichment task as a whole only resolves once parsing has actually been kicked off.
3. Add a thin `declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };` shim at the top of the file to keep TypeScript happy (Deno Deploy provides it at runtime).

No DB schema changes. No UI changes. No changes to `auto-parse-intake-notes` or `fetch-ghl-contact-data`.

## Backfill for already-affected AVA appointments

A short, separate one-shot script after the deploy: find AVA `all_appointments` rows where `parsing_completed_at IS NULL` or `parsed_insurance_info IS NULL` and `ghl_id IS NOT NULL`, and invoke `fetch-ghl-contact-data` + `auto-parse-intake-notes` for each. I'll list the affected rows for your review before running anything.

## What you'll see after the fix

- New GHL appointments: insurance Provider / Plan / Member ID / Group Number appear in the portal within seconds of the appointment being created, every time.
- No more "ghost" empty insurance cards that only populate after a manual refresh.

## Reply with "go" to implement

Or tell me if you'd rather I also (a) add an alert when an appointment has `patient_intake_notes` but no `parsing_completed_at` after 5 minutes, and/or (b) run the backfill across **all** projects, not just AVA.
