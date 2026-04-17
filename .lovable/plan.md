

## Analysis: Tammie Huckeby Duplicate Profile / False Alert

### What Actually Happened

Tammie Huckeby has **two separate appointments in GHL**, each with a different `ghl_appointment_id`:

| Record | GHL Appt ID | Calendar | Date | Status | Created | Updated |
|---|---|---|---|---|---|---|
| 1 | `1EAGN7Qkm0jPxoq11tOa` | Neuropathy @ Crossville | **Apr 21** @ 3:15 PM | **Cancelled** | Mar 29 | Apr 16, 8:09 PM |
| 2 | `877CPabkwyZwkUDdRI45` | GAE @ Crossville | May 19 @ 2:00 PM | **Confirmed** | Apr 16, 8:07 PM | Apr 16, 8:07 PM |

Both share the same GHL contact ID (`YMcGnc1qX3JSMc9meHuD`) — same patient, two distinct appointments.

### Why "two profiles" appear in the portal
This is **not actually two profiles** — it's two separate appointment records (which is correct behavior, since the recent fix to `findExistingAppointment` ensures distinct GHL appointments stay separate). The portal just displays each appointment as its own card. The patient is one contact in GHL.

### Why the short-notice alert fired
Looking at the timeline on Apr 16:
1. `20:06:04` — Status changed from `Scheduled` → `Cancelled` on the Apr 21 record
2. `20:07:46` — The new May 19 (GAE) appointment was created, **status defaulted to Confirmed** (per our "GHL Default Confirmed" rule for new webhooks)
3. `20:09:21` — Another cancellation update came through for the Apr 21 record

When the new May 19 appointment was created and inserted with status `Confirmed`, it triggered the short-notice alert evaluation in `ghl-webhook-handler` (line 1279). However, **our `short_notice_alerts` table has NO record of an alert being sent for either of Huckeby's appointments** — only one for "Tammie Scafidi" back on Mar 28.

### Most likely cause of the alert the client received
Because no entry exists in `short_notice_alerts`, the alert the client got was **almost certainly fired from GHL itself** (a GHL workflow tied to the Apr 21 Neuropathy appointment), **not from our portal**. GHL workflows often have their own appointment-reminder automations that fire independently, and if the GHL workflow wasn't properly halted when the Apr 21 appointment was cancelled, GHL would still send the reminder.

### Verification needed (cannot do from portal side)
- Check the **GHL workflow/automation** attached to the Neuropathy calendar — confirm it has a "cancellation" trigger that removes the contact from the reminder sequence
- The portal's audit trail confirms WE did not send the alert

### Recommendation
| Issue | Action |
|---|---|
| "Two profiles" in portal | Working as designed — these are two distinct GHL appointments for the same contact. No fix needed. |
| Alert for cancelled Apr 21 appt | **Not from the portal** — investigate the GHL workflow attached to the Neuropathy calendar. The portal's `short_notice_alerts` table has zero entries for Huckeby. |
| Optional safety net | Add a guard in `ghl-webhook-handler` short-notice block (line 1279) to skip alerting if the appointment status is in the terminal-status list (`cancelled`, `no show`, etc.) — currently it only checks `hoursDiff > 0`. This would prevent any future portal-side alerts on cancelled appts. |

### Proposed code-side safeguard (if you want it)
**File:** `supabase/functions/ghl-webhook-handler/index.ts` (~line 1279)
**Change:** Add a status check before invoking `notify-slack-short-notice`:
```
if (TERMINAL_STATUSES.includes(appointment.status?.toLowerCase())) {
  console.log(`Skipping short-notice alert — status is ${appointment.status}`);
  return;
}
```
Apply the same guard to `update-appointment-fields/index.ts` (line 254) and `all-appointments-api/index.ts` (line 444).

This prevents the portal from ever sending a short-notice alert for an appointment that's already in a terminal state — defense-in-depth even though our records show no alert was sent in this case.

