# Fix Trainee Submitted bookings missing from the Review Queue

## Confirmed diagnosis

- The new GHL lead **Test Johann Do not decline** does not exist in `all_appointments`, including outside the Trainee bucket.
- There is no Ally Vascular request for this lead in the current `ghl-webhook-handler` logs around the test time.
- Ally's project row has GHL credentials and the expected location id. The screenshot confirms the contact has **Insurance Intake Source = Trainee Submitted** and a live appointment.
- This failure happened before trainee classification: the Portal never received the appointment webhook. The existing delayed intake-source retry only runs after a Portal row is created, so it cannot recover this case.

## Changes

### 1. Add missed-appointment reconciliation
Create a focused Edge Function that periodically checks recent GHL appointments for configured projects and compares their GHL appointment ids with `all_appointments`.

For a missing appointment it will:
- fetch the GHL appointment and contact,
- resolve custom-field definitions and **Insurance Intake Source**,
- create the Portal row with the same review-queue defaults as normal webhook ingestion,
- route `trainee_submitted` directly to `review_status='pending'` and `review_stage='trainee'`,
- preserve the existing Setter Submitted bypass and Patient Submitted/New behavior,
- trigger the existing enrichment and parsing pipeline.

### 2. Make recovery idempotent and safe
- Deduplicate by project and GHL appointment id before inserting.
- Ignore reserved blocks, terminal GHL events, and past appointments using the same guards as `ghl-webhook-handler`.
- Never modify declined/dismissed frozen snapshots or merge a new event into a terminal record.
- Process bounded batches so a sweep stays within Edge Runtime limits.

### 3. Schedule and instrument the sweep
Run reconciliation on a short interval and log, per project:
- GHL events inspected,
- already-synced events,
- recovered appointments,
- skipped events and errors.

This becomes a safety net for future webhook delivery gaps without changing normal real-time ingestion.

### 4. Recover and verify this test
- Run reconciliation against Ally Vascular's recent appointment window.
- Confirm **Test Johann Do not decline** is created once with `insurance_intake_source='trainee_submitted'`, `review_stage='trainee'`, and `review_status='pending'`.
- Confirm it appears in **Trainee Review**, not New or the clinic-facing portal.
- Re-run the sweep and confirm no duplicate is created.

## Technical scope

- New reconciliation Edge Function using the project's existing GHL credential, timezone, and custom-field patterns.
- Scheduled invocation through Supabase.
- Extract a small shared ingestion helper from `ghl-webhook-handler` only if needed to keep routing behavior identical.
- No Review Queue UI or schema change is expected.
