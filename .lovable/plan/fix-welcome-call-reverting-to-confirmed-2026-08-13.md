# Fix: "Welcome Call" reverting to "Confirmed"

## What's happening

Confirmed on the Nashville record (Jamesena L Johnson, Nashville Vascular & Vein Institute):

```text
15:05:18  Portal update by Gianna Mannello: Confirmed → Welcome Call
15:05:25  Status changed from "Welcome Call" to "Confirmed" via GHL sync
```

Seven seconds after the clinic set Welcome Call, a GoHighLevel webhook wrote `Confirmed` back over it.

Why: **Welcome Call is a portal-only status** — GoHighLevel has no equivalent, so the outbound sync deliberately skips it (`update-ghl-appointment` has no mapping for it). The appointment therefore stays `confirmed` in GHL. The next inbound GHL webhook for that contact (the reschedule echo, an insurance upload, any contact edit) carries `status: confirmed`, and the webhook handler currently only protects the terminal statuses (OON, Do Not Call, Cancelled) from being overwritten. Welcome Call is explicitly excluded from that guard, so it gets stomped and the record drops back into the New tab.

The July 9 reference in the Milo Johnson record is unrelated — those are carried-forward notes from the superseded booking. Same underlying cause on both clinics.

## The fix

Treat Welcome Call as a portal-owned mid-flow state in `ghl-webhook-handler`:

- Keep allowing GHL to move it forward to a genuinely meaningful status: Cancelled, No Show, Showed, Won, Rescheduled (the existing Welcome Call transition note keeps firing for these).
- Ignore an incoming `confirmed`/`booked`/`new` when the portal row is already `Welcome Call`, since that is GHL restating the pre-existing booking state, not a real change. Log the skip instead of writing a misleading status-change note.

## Cleanup of the two affected records

Restore `status = 'Welcome Call'` on the Nashville record (`f846c3a1`) and the Mara Vascular record, and remove the incorrect "Status changed from Welcome Call to Confirmed via GHL sync" notes so the history reads correctly.

## Technical detail

- `supabase/functions/ghl-webhook-handler/index.ts` (~line 1941-1972): add a `welcome call` branch to the status guard — skip the update when the incoming normalized status is one of `confirmed`, `booked`, `new`, `unconfirmed`; otherwise fall through to existing behaviour.
- No schema change, no frontend change.
