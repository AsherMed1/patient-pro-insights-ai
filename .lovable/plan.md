
## Confirmed diagnosis

Your GHL screenshot shows two separate appointments for Jill Blevins, both at July 9 2:30 PM:

1. **Confirmed** — a brand-new event with its own `ghl_appointment_id`
2. **Cancelled** ("Rescheduled to July 9, 02:30 PM") — the original event; this is the one already in our DB as row `603b8637` (status Cancelled, `was_ever_confirmed=true`).

Our DB only has the Cancelled row. The Confirmed row was never inserted.

Walking the webhook logic for the new confirmed event:

1. `findExistingAppointment` looks up by the new `ghl_appointment_id` → no match.
2. Falls into the reactivation branch, which requires `was_ever_confirmed = false`. Our cancelled row is `was_ever_confirmed = true`, so it's skipped.
3. Should return `null` → handler should create a fresh row.

Since no row exists, either GHL never delivered the "appointment created" webhook for the new event, or the handler received it and errored before insert (no matching logs found for this contact in recent retention).

## Fix plan

### 1. Recover Jill Blevins' confirmed appointment (one-time)

- Look up the new event via our existing GHL calendar sync helper for contact `foSMURdTUCSZoXbpeuAR` in Apex Vascular to grab the `ghl_appointment_id`, calendar name, and confirm date/time (July 9, 2026 2:30 PM EDT).
- Insert a new row in `all_appointments`:
  - `ghl_id = 'foSMURdTUCSZoXbpeuAR'`, `ghl_appointment_id` = new event ID
  - `project_name = 'Apex Vascular'`
  - `lead_name`, `lead_phone_number`, `lead_email`, `dob` mirrored from row `603b8637`
  - `status = 'Confirmed'`, `date_of_appointment = '2026-07-09'`, time = 14:30
  - `calendar_name = 'Request your GAE Consultation at North Knoxville'`
  - `review_status = 'pending'` (so it lands in the Review Queue)
  - `is_superseded = false`, `was_ever_confirmed = true`
- Leave the Cancelled row (`603b8637`) untouched as history.

### 2. Close the reactivation gap (`supabase/functions/ghl-webhook-handler/index.ts`, `findExistingAppointment` ~line 1386)

Change the reactivation branch so a portal-only terminal row (`Cancelled`, `OON`, `Do Not Call`) never absorbs a NEW GHL event and never blocks the "create new row" path:

- If the existing row's status is portal-only terminal AND the incoming event has a different `ghl_appointment_id` from what's stored, do NOT reactivate in place. Return `null` so the handler creates a fresh row.
- Reactivation-in-place stays reserved for non-portal-terminal rows (e.g., `Rescheduled`, plain `No Show`) where `was_ever_confirmed = false`, matching today's behavior for those cases.

Net effect: a Cancelled/OON/DNC row can never silently swallow a subsequent GHL booking — the new event always produces a new pending row visible in the Review Queue.

### 3. Add observability

At the top of `findExistingAppointment`, when we detect "portal-terminal row exists for same contact+project but incoming `ghl_appointment_id` differs," emit `console.log('[REBOOKING NEW ROW]', ...)` with contact ID, both appointment IDs, and existing status. Durable trail if this recurs.

### 4. Verify

- Re-check `all_appointments` for `ghl_id = 'foSMURdTUCSZoXbpeuAR'` → expect 2 rows (Cancelled + new pending Confirmed).
- Open Apex Vascular → Review Queue → the confirmed 7/9 appt appears as pending.
- Deno test on `findExistingAppointment` covering the "portal-terminal + different appt_id" path.

### 5. Memory update

Append to `mem://integrations/ghl-webhook-sync-logic-v3`: "Portal-only terminal rows (Cancelled/OON/DNC) never block or absorb a subsequent GHL booking with a different `ghl_appointment_id` — the handler always creates a fresh pending row so it lands in the Review Queue."
