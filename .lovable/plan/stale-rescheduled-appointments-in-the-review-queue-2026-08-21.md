# Stale rescheduled appointments in the Review Queue

## What's happening (Richard Muniz, Joint & Vascular Institute)

The Aug 25 row stayed in the **New** bucket after the Sep 1 booking was approved and sent to the clinic. Three separate gaps cause this:

1. **Pending rows are never retired.** The webhook's supersede step (`supersedeOlderContactRows`) explicitly skips any sibling whose `review_status` is `pending`, so a row still waiting on a Review Queue decision survives even when a newer booking for the same contact and project arrives.
2. **No GHL deletion sync.** Deleting the appointment in GHL sends no signal the portal acts on, so the row stays fully actionable in the queue.
3. **Decline can target the wrong GHL event.** Decline cancels using the `ghl_appointment_id` stored on the portal row. When two portal rows share one GHL event id (14 event ids in the database are currently shared by more than one active row), declining the stale row cancels the event backing the patient's current appointment. There is no guard that re-reads the event and checks it still matches the row being declined.

The Review Queue list query also does not filter out `is_superseded = true` rows (the count query does), so anything retired can still reappear in the table.

## Fix

### 1. Retire older pending rows when a newer booking arrives
Drop the pending exemption in the webhook supersede step: an older row for the same contact + project is retired when a newer booking exists, whether or not it is still pending. Keep every existing guard — reserved blocks untouched, rows dated *after* the new booking untouched, declined/dismissed snapshots untouched. Each retired row gets an internal note naming the booking that replaced it.

### 2. Sync GHL cancellations and deletions
Handle GHL appointment delete events in the webhook: locate the row by the specific `ghl_appointment_id`, mark it superseded (and status Cancelled if it was not terminal), and write an internal note "Appointment deleted in GoHighLevel". A deleted/cancelled GHL event must leave no actionable Review Queue row.

### 3. Make decline event-specific and safe
Before cancelling in GHL, re-read the event by the row's `ghl_appointment_id` and compare it to the row:

- **Event missing in GHL (404):** skip the GHL call entirely, retire the row locally (superseded + declined), note "Appointment no longer exists in GoHighLevel — record cleared without a GHL cancellation."
- **Event's date/time no longer matches the row** (i.e. the event was rescheduled and now backs a newer booking): refuse the GHL cancellation, retire the row locally, and tell the user the newer appointment was left untouched.
- **Event matches:** cancel as today.

Also suppress the contact-level GHL side effects (decline reason tag, contact note, DND) when the row is being cleared as stale rather than genuinely declined, so a stale cleanup can't tag or block a patient who has a live appointment.

### 4. Hide retired rows from the queue
Add the `is_superseded` filter to the Review Queue list query so retired rows disappear immediately and counts match the table.

### 5. One-time cleanup
Report the contacts that currently hold a pending row plus a newer approved row for the same project, then retire the older pending rows with the same internal note. Report first, apply after review. No deletions.

## Technical notes

- `supabase/functions/ghl-webhook-handler/index.ts`: remove the `review_status === 'pending'` early return in `supersedeOlderContactRows`; add an `AppointmentDelete` branch in the event dispatcher that resolves the row by `ghl_appointment_id` only.
- `supabase/functions/update-ghl-appointment/index.ts`: return a distinct `not_found` code on a 404 read-back plus the event's current `startTime`, so callers can verify ownership instead of blindly issuing the PUT.
- `src/utils/appointmentStatusChange.ts`: add an option to skip the GHL API call (local-only retirement) and surface the `not_found` / mismatch outcomes to the caller.
- `src/components/admin/ReviewQueue.tsx`: `is_superseded` filter on the list fetch; ownership pre-check inside `performAction` before `changeAppointmentStatus`; stale-path messaging in the decline toast.
