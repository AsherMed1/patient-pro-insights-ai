# Reconcile missed GHL appointments

## Goal
Add an automated safety net for GHL appointments whose create webhook never reaches the Portal, including Trainee Submitted bookings that must land in Trainee Review.

## Implementation
1. **Add a reconciliation Edge Function**
   - Scan recent and upcoming GHL calendar events for configured projects, with optional project/location and date-range inputs for targeted recovery.
   - Compare each GHL appointment ID against `all_appointments.ghl_appointment_id`.
   - Ignore events already represented in the Portal, reserved-time blocks, and terminal historical events.

2. **Reuse the existing ingestion workflow**
   - For every missing event, fetch the full GHL contact and custom-field definitions so Insurance Intake Source is available by field ID/name.
   - Build the same standard event payload accepted by `ghl-webhook-handler` and invoke that handler instead of duplicating appointment creation rules.
   - Preserve current routing: `trainee_submitted` → pending Trainee Review; `setter_submitted` → approved bypass; other/missing sources → New review.

3. **Make the sweep safe and observable**
   - Deduplicate by project/location plus GHL appointment ID before ingestion and rely on the webhook handler’s existing update/deduplication safeguards for races.
   - Return per-project counts for scanned, already present, recovered, skipped, and failed events without exposing GHL credentials or patient details in routine logs.
   - Validate request inputs and require either an authenticated admin/trainer caller or the internal scheduled-sweep credential path.

4. **Schedule automatic reconciliation**
   - Register a recurring Supabase cron invocation so webhook gaps self-heal without manual action.
   - Keep an on-demand targeted mode for immediate recovery of a specific project/location and date window.

5. **Recover and verify the reported Ally test**
   - Run a targeted Ally Vascular sweep covering the reported appointment date.
   - Confirm the missing GHL event creates exactly one Portal row with `insurance_intake_source = 'trainee_submitted'`, `review_stage = 'trainee'`, and `review_status = 'pending'`.
   - Run the same sweep again and confirm it creates no duplicate.

## Technical scope
- New: `supabase/functions/reconcile-ghl-appointments/index.ts`
- Update: `supabase/config.toml` only if function-specific configuration is required.
- Scheduled job: created directly in the connected Supabase project because its URL/key are project-specific.
- No database schema change is expected.
