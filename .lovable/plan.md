## What I verified

Queried the database and read `ghl-webhook-handler`:

- Contact `J4bdMPfshldJPLSaoYRI` (Naadi Healthcare) has exactly **one** portal row: `d5798107` — calendar "Request your Neuropathy Consultation - Manteca", `ghl_appointment_id 8A6bhQIjzmqEYxlDHZvy`, status **Cancelled**, `was_ever_confirmed = true`, `is_superseded = false`, `reschedule_history = []`, `updated_at = Jul 2, 18:07` (the cancellation). Nothing has touched that row since.
- The GAE event's appointment ID exists nowhere in `all_appointments`, and the raw mirror table `ghl_appointments` has **no rows at all** for this contact.
- Concurrent bookings per contact are **not** globally blocked: 15+ Naadi contacts have 2–5 distinct `ghl_appointment_id` rows, and the "Request your GAE Consultation - Manteca" calendar has 319 rows, most recent Jul 27. So neither the calendar nor the multi-row case is broken in general.
- The reactivation branch in `findExistingAppointment` could not have swallowed it: it requires `was_ever_confirmed = false`, and this row is `true`. No reactivation entry in `reschedule_history` either.

**Conclusion so far:** for this specific booking, the portal never received (or never accepted) a webhook — not a dedupe collapse. The GHL event title "Ronald Martinez GAE Consultation - Manteca" is the contact-name-prefixed format GHL uses for **manually created** calendar events, and only 1 of 320 Manteca GAE rows in the portal has that title shape, which points at the workflow trigger not firing for staff-created appointments. That last step is **not yet confirmed** — it needs a GHL-side check before I state it as the cause.

## Real code defect found while investigating

Independent of Ronald, there is a genuine second-booking hazard in `findExistingAppointment` (lines ~1734–1765): when a payload arrives **without** `ghl_appointment_id`, the contact fallback selects `.eq(ghl_id).eq(project_name).order(created_at ASC).limit(1)` — the **oldest** row for that contact. A second, brand-new booking on a different calendar therefore mutates the patient's oldest (often cancelled/closed) record instead of creating its own. And because `cancelled` is in `portalOnlyStatuses`, the incoming Confirmed status is then discarded — producing exactly the "confirmed in GHL, cancelled in portal" symptom.

## Plan

1. **Confirm the GHL side (first, before any fix).** Call the GHL API for contact `J4bdMPfshldJPLSaoYRI` to list its appointments, capture the GAE event's ID, calendar ID, created-by and creation timestamp, then check `ghl-webhook-handler` logs for that appointment ID / that time window. This decides between "webhook never fired (GHL workflow trigger gap)" and "webhook fired and we skipped it".
2. **Fix the oldest-row fallback.** In the contact-only fallback, prefer the **newest non-superseded, non-terminal** row and skip rows whose calendar differs from the incoming calendar; fall back to creating a new row rather than mutating an unrelated closed appointment.
3. **Guard the status contradiction.** When an incoming Confirmed/scheduled payload is matched to a row whose status is a portal-only terminal state and whose `ghl_appointment_id` differs from the incoming one, do not silently update — create a new row instead, and log the decision.
4. **Repair Ronald Martinez.** Create the GAE Confirmed portal record (Jul 27, Manteca, Naadi Healthcare) with the real GHL appointment ID from step 1, leaving the Neuropathy row Cancelled as history.
5. **Sweep for the same pattern.** List Naadi (and portal-wide) contacts whose only row is a cancelled/terminal appointment while a different calendar's booking exists in GHL, and report the count before deciding on any bulk backfill.

## Technical notes

Files touched: `supabase/functions/ghl-webhook-handler/index.ts` only (matching + status-guard logic). Ronald's repair and any sweep run as data operations, not schema changes. If step 1 shows the workflow never fires for manually created events, the durable fix is on the GHL side (add the "Appointment Created/Updated" trigger to the Naadi workflow) — I will flag that rather than paper over it in code.
