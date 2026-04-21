

## Belinda Yeary — Force Resync Apr 23 Appointment from GHL

### What's happening
- Original Apr 22 2:45 PM slot was rescheduled to Apr 23 3:00 PM in GHL
- Setter then **deleted the original cancelled GHL event** to stop the reminder bot
- Insights portal still shows only the cancelled Apr 22 record — the new Apr 23 confirmed event never made it into `all_appointments`

### Root cause (high confidence)
The new Apr 23 event was created in GHL **after** the deletion of the original. Either:
1. The `ghl-webhook-handler` never received an `AppointmentCreate` webhook for the new event (GHL doesn't always re-fire creates after deletions in the same contact thread), OR
2. The webhook fired but the new event's `ghl_id` matched the old (deleted) record's `ghl_id` and our update logic skipped it because the old record is in a terminal `Cancelled` state (protected from GHL overwrites per `ghl-webhook-sync-logic-v3`)

Either way, the fix is the same: **manually pull the new Apr 23 event from GHL into the portal.**

### Investigation step (read-only, before writing the fix)
Query `all_appointments` for Belinda Yeary in APEX Vascular to confirm:
- Only the Apr 22 cancelled record exists
- Capture its `ghl_id` and `ghl_appointment_id`
- Check GHL contact `jvWBldD5oWJEJJgQ21lY` for current appointments via `fetch-ghl-contact-data` to get the new Apr 23 event ID

### One-time fix (no code change, runs as a utility)

Create `src/utils/syncBelindaYearyApr23.ts` modeled on existing `insertRhondaNelson` / `recreateMissingPremierAppointments` utilities:

1. **Fetch the live Apr 23 event from GHL** via the existing `get-ghl-availability` / contact endpoints to get the real event ID, calendar ID, assigned user, and exact start/end times
2. **Insert a new `all_appointments` row** for Apr 23 3:00 PM with:
   - `status` → `Confirmed`
   - `ghl_id` / `ghl_appointment_id` → from GHL
   - `calendar_name`, `ghl_location_id`, all contact fields → copied from existing Apr 22 record
   - `internal_process_complete` → false (so it appears in New tab for setter review)
   - Internal note: "Recreated from GHL after rescheduling — original Apr 22 event was deleted in GHL by setter to stop reminder bot. Manual sync by support."
3. **Leave the Apr 22 cancelled record alone** — it correctly reflects what happened
4. **Auto side-effects** (handled by triggers, no extra work):
   - Auto-parse fires on the new record (intake notes inherit from contact)
   - EMR queue picks up the new Confirmed appointment
   - Reschedule history is documented via the internal note

### What you'll see after
Belinda Yeary will have **two rows** in Insights:
- Apr 22 2:45 PM — Cancelled (historical, accurate)
- Apr 23 3:00 PM — Confirmed (newly synced from GHL, matches GHL)

If you'd rather only see the new one, say "delete the cancelled row too" and I'll add that as a step.

### Out of scope
- **Fixing the underlying gap** (events created in GHL after a deletion not auto-syncing) — that's a separate investigation against `ghl-webhook-handler` to add an "orphan event recovery" check. Worth doing later but not blocking this cleanup.
- **Backfilling other patients with the same issue** — only fixing Belinda right now.

### Files touched
| File | Change |
|---|---|
| `src/utils/syncBelindaYearyApr23.ts` (new) | One-off sync utility, runs once from console or temporary button |

### Risk
Low. Purely additive — inserts one row, doesn't modify or delete anything existing.

### Approve to proceed
Approve and I'll switch to default mode, pull the live GHL data for the Apr 23 event to get the real IDs, and run the one-time sync.

