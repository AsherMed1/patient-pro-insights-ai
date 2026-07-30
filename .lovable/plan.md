## Goal

Stop the portal from showing the same patient multiple times. One GHL contact should surface exactly one active appointment row per project; older bookings stay in the database as history but drop out of portal views.

## What I verified

Orlando Gonzales (contact `NJEuukP87bjduMnIZFI7`, Ally Vascular and Pain Centers) has three rows, each from a *different* GHL appointment event:

```text
Apr 10, 2026  10:00  Showed      appt 40mZxCbWEM7LzHZ4fU9p   name "Rolando Gonzalez"
Jul 16, 2026  10:00  Cancelled   appt 7BK71KaQAYje8XpxTzJ9   name "Rolando Gonzalez"
Aug  8, 2026  10:30  Confirmed   appt wRnHwjWlKgiUqqz3ro7M   name "Orlando Gonzales"
```

All three have `is_superseded = false`, so all three render. The existing reactivation logic in `ghl-webhook-handler` only reuses a closed row when `was_ever_confirmed = false`; these were all confirmed, so each rebooking created a fresh row. The name also drifted because only the newest row picked up the corrected GHL contact name.

## Changes

**1. Auto-supersede prior rows on new booking (`supabase/functions/ghl-webhook-handler/index.ts`)**

When a webhook creates a brand-new appointment row (new `ghl_appointment_id`) for a contact that already has rows in the same project:

- Find all other non-superseded, non-reserved rows with the same `ghl_id` + `project_name`.
- Mark each as `is_superseded = true` when its status is terminal (Cancelled/Canceled/No Show/Showed/Won/OON/Do Not Call/Rescheduled) **or** its appointment date is before the new booking's date.
- Never supersede a row that is still open *and* dated on/after the new booking (a genuine second future appointment stays visible).
- Never touch rows in Review Queue `pending` state — those must stay in the queue for a decision.
- Write an `appointment_notes` audit row on each superseded record: "Superseded by newer GHL booking {appt id} on {date} — System".

**2. Sync contact name across all rows**

In the same handler, whenever an incoming payload carries a contact name that differs from the stored `lead_name`, update `lead_name` on every non-superseded row for that `ghl_id` + `project_name`, not just the matched row. Log the rename as a status/audit note on the active row only, so history rows don't get noise.

**3. One-time backfill**

Run a read-only audit query first to count affected contacts, then a single migration that applies the same rule to existing data: for each `(ghl_id, project_name)` with more than one non-superseded row, keep the newest row by appointment date (falling back to `created_at`) and set `is_superseded = true` on the older ones, skipping `review_status = 'pending'` rows and reserved blocks. Also normalizes `lead_name` to the newest row's name per contact. Orlando's two older rows are covered by this.

## Notes

- Superseding is non-destructive: rows stay queryable, and the Activity/History timeline already reads superseded rows, so the patient's full booking history remains visible on the surviving record.
- Dashboards and portal lists already exclude `is_superseded = true`, so no UI changes are needed.
- Rescheduling through the portal is unaffected — it updates in place and doesn't create a second row.
