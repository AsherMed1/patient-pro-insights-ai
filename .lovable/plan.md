
The user clarified: the new May 19 appointment for Saul Martinez (created Apr 16) was **incorrectly inserted as "No Show"** — it inherited the status from the original Apr 16 No Show appointment instead of defaulting to "Confirmed" per our standard rule.

Per `mem://integrations/ghl-default-appointment-status-confirmed`: ALL new appointments from GHL webhooks should default to "Confirmed" regardless of the GHL-provided status.

Let me verify the actual data and the webhook handler logic before finalizing.

The Stack Overflow hint suggests the bug is in `ghl-webhook-handler` where status inheritance happens. I need to look at the webhook handler's appointment-creation branch to confirm — but based on the clearly stated rule (always default new appointments to Confirmed) and the symptom (May 19 appt showing as No Show), the fix is to ensure the INSERT path (not the UPDATE path) always sets status to "Confirmed" for brand-new appointments, ignoring whatever status GHL sent.

## Fix: New Appointments Must Always Default to "Confirmed"

### Problem
Saul Martinez's May 19 appointment (a brand-new GHL appointment created on Apr 16) was inserted with status **"No Show"** instead of **"Confirmed"**. This violates the core rule that all newly-created appointments from GHL must default to Confirmed.

### Likely Cause
In `supabase/functions/ghl-webhook-handler/index.ts`, the INSERT branch (when `findExistingAppointment` returns null) is using the GHL-provided status (`appointmentStatus` from the webhook payload) instead of forcing "Confirmed". When the May 19 appointment came through, GHL may have sent a status that mapped to "No Show", or some inheritance/copy logic from a previous lookup leaked in.

### Investigation Steps (during implementation)
1. Read `supabase/functions/ghl-webhook-handler/index.ts` INSERT path
2. Confirm where `status` is set on new appointment inserts
3. Check the May 19 record's `created_at`, `updated_at`, and audit trail to see if it was inserted as No Show or updated to No Show after creation

### Fix
In the INSERT branch of `ghl-webhook-handler`:
- **Force** `status: 'Confirmed'` for every newly-inserted appointment, regardless of what GHL sends
- Apply terminal-status guard already in place (skip insert if GHL says cancelled/no-show on a brand-new event — already handled per `mem://constraints/terminal-status-appointments-not-created`)
- Ensure no status inheritance from any previously-found record leaks into the insert payload

### Data Cleanup
- Update Saul Martinez's May 19 appointment (`K7ozq84rlenkEgDApMmZ`) status from "No Show" → "Confirmed"
- This will trigger the existing `handle_appointment_status_completion` trigger, which correctly sets `internal_process_complete = false` and clears procedure fields for Confirmed status

### Files
- `supabase/functions/ghl-webhook-handler/index.ts` — enforce `status: 'Confirmed'` on insert
- One-time SQL update for Saul Martinez's May 19 record

### Verification
- Confirm the May 19 record now shows as Confirmed in the portal
- Confirm no regression on the Apr 16 No Show record (it should remain No Show)
- Future new appointments will always default to Confirmed
