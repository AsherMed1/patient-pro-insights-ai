

## Vivid – Riviann Jerry "Duplicate" Investigation

### What's actually in the database
Same patient (one GHL contact `NcqzoIxXceg4j1rLHiVv`), **two distinct GHL appointments** booked on different days at different locations:

| Record | GHL Appt ID | Location | Date | Status | Booked |
|---|---|---|---|---|---|
| A | `s0hXKzD5fgtpegS2pdq7` | **Hollywood, FL** | Apr 28, 2026 | Confirmed | Apr 18 20:35 UTC |
| B | `v9VeSGGA2Go0U7m2H5YV` | **Miami, FL** | May 11, 2026 | Confirmed | Apr 18 19:08 UTC |

Both have the same phone, email, DOB, and GHL contact ID — same person. Each has a unique `ghl_appointment_id` from GHL, so the portal correctly created two records (same as the Tammie Huckeby case).

### This is not a portal bug
Riviann was booked into **two separate calendars in GHL** — Miami first (19:08), then Hollywood ~90 min later (20:35). GHL sent us two `appointment.create` webhooks with different appointment IDs, so we have two records. That's correct system behavior.

### What's likely going on
One of three scenarios:
1. **Patient/agent double-booked by mistake** — booked Miami first, then re-booked Hollywood thinking the first didn't go through (or vice versa). The Miami one (older) should probably be cancelled.
2. **Intentional reschedule that wasn't done as a reschedule** — agent created a new appointment instead of using the reschedule flow on the existing one. Result: old one still sits Confirmed, new one also Confirmed, both clutter the portal.
3. **Two real visits intended** (e.g. consultation + procedure prep) — unusual for two UFE consultations, but possible.

### Recommendation
**No code change.** The portal is doing exactly what it should. The fix is operational — the Vivid team needs to:
1. Confirm with the patient which appointment is the real one
2. Cancel the other in the portal (status → Cancelled). That will:
   - Sync the cancellation to GHL
   - Remove it from the EMR queue automatically (per the trigger we shipped Apr 17)
   - Mark IPC=true so it drops off the New tab

If they confirm both are needed (Hollywood Apr 28 + Miami May 11), leave both as-is.

### Optional future enhancement (not part of this fix)
If duplicate-confirmed-appointments-per-contact happen often, we could add a portal warning badge: "⚠️ This contact has 2 confirmed upcoming appointments at different locations" on each card, surfacing the situation without touching data. Would be a follow-up if the team wants it.

### What I need from you
Which appointment should be kept — Hollywood Apr 28 or Miami May 11? Or both? Once you confirm, the team cancels the other one in the portal and the duplicate disappears from view.

