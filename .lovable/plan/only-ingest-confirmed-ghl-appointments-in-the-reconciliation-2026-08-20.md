# Only ingest confirmed GHL appointments in the reconciliation sweep

## Confirmed diagnosis

- The reconciliation sweep (`reconcile-ghl-appointments`) filters candidate GHL events only by "has an ID, has a contact, is not a Reserved block". It never looks at the event's appointment status.
- As a result it pulls unconfirmed events (GHL badge "New", no insurance submitted) into the Portal, and they are written with `status = 'Confirmed'`, `review_status = 'pending'`, `review_stage = 'new'`.
- Verified in the database: 19 pending rows were created by the sweep in the last ~20 minutes, including Clyde Hunt (Champion Heart), plus Nashville Vascular & Vein and Humble Vascular batches — matching the Slack report.

## Changes

### 1. Skip unconfirmed events during reconciliation
In `reconcile-ghl-appointments`, only treat an event as a recovery candidate when its GHL appointment status is `confirmed`. Events with `new`, `invalid`, `cancelled`, `noshow`, `showed`, or a missing status are counted as skipped and never sent to ingestion.

- Read the status from whichever field GHL returns (`appointmentStatus`, falling back to `status`), lowercased and trimmed.
- Report skipped-unconfirmed separately in the per-project summary so the sweep stays observable.

This affects only the sweep. Real-time `ghl-webhook-handler` behavior is unchanged, so normal bookings continue to flow as they do today.

### 2. Remove the unconfirmed rows the sweep already created
Delete the sweep-created rows that are still untouched:

- Created by the recent sweep window, `review_status = 'pending'`, no notes, no contact attempts, no review history, not trainee-stage.
- Cross-check each one against GHL first and delete only those whose GHL appointment status is not `confirmed`.
- Leave the Ally trainee test record and anything a user has already worked in place.

Once GHL marks any of these confirmed, the next sweep (or the live webhook) brings them in normally.

### 3. Verify
- Re-run a dry-run sweep for Champion Heart, Nashville Vascular & Vein, and Humble Vascular and confirm unconfirmed events are reported as skipped, not recovered.
- Confirm the Review Queue "New" count drops to the genuinely confirmed appointments only.
- Re-run the sweep once more to confirm no duplicates and no re-creation of the deleted rows.

## Technical scope

- Update: `supabase/functions/reconcile-ghl-appointments/index.ts` (status gate + summary counter).
- Data cleanup executed against `all_appointments` for the identified sweep-created rows.
- No schema change, no Review Queue UI change.
