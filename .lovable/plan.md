# Stale rescheduled appointments in the Review Queue

## What the code and data show (verified)

Richard Muniz (Joint & Vascular Institute, contact `PPvrQB32WjE8aabeews0`) has exactly two rows:

- Aug 25 booking, GHL event `ARhB9MQaf1O7PgOzUVaa` — now Cancelled / declined / superseded.
- Sep 1 booking, GHL event `pZ4Fdcioq8dk5Todt1GY` — Confirmed / approved.

Three concrete problems in the current code:

1. **Pending rows are exempt from supersede.** `supersedeOlderContactRows` in the GHL webhook handler explicitly skips any sibling whose `review_status = 'pending'`. So when a patient rebooks, the older row keeps sitting in the **New** bucket instead of being retired — exactly the reported symptom.
2. **No deletion sync.** The webhook handler only understands appointment create/update payloads. An appointment deleted in GHL produces no portal change at all, so the record stays actionable forever.
3. **Shared GHL event IDs make decline dangerous.** 14 GHL appointment IDs in the last 90 days are attached to more than one portal row. When two rows share an event ID, declining the stale row sends a cancel for the event the live row also points at. Even when IDs differ, the decline path fires contact-level side effects (decline tags, GHL contact note) that trigger the clinic's cancellation workflow for the patient as a whole, not just that booking.

No pending row is currently stuck behind a newer booking (the Muniz one was manually declined), so this is a prevention + guardrail fix, not a large backfill.

## Fix

### 1. Retire the old row when a newer booking arrives
Replace the blanket "skip pending rows" rule in `supersedeOlderContactRows`. A pending row is superseded when a strictly newer booking exists for the same contact and project (different GHL event ID, later appointment date/time or later creation). When that happens:
- Mark it `is_superseded = true`, set `review_status = 'dismissed'` with reason "Replaced by newer booking", and write an internal note naming the replacing event ID and date.
- Never fire any GHL call for this transition — the old event is already gone or being cancelled by GHL itself.
- A pending row is still protected when the newer sibling is *not* actually newer (same slot, echo-back within the 120s debounce).

### 2. Sync GHL deletions and cancellations
Handle GHL appointment-delete payloads in `ghl-webhook-handler`: locate the row by `ghl_appointment_id`, set status Cancelled, mark it non-actionable (`review_status = 'dismissed'` if still pending, keeping the existing auto-decline behaviour for cancelled events), clear it from the queue, and write an internal note "Appointment deleted in GoHighLevel".

### 3. Make decline target only its own GHL event
Before the decline pushes a cancellation, verify ownership:
- Read the GHL appointment by the row's `ghl_appointment_id` and confirm its start time matches the portal row's date/time. If GHL reports a different date/time, the event has been rescheduled — abort the cancel, mark the row dismissed/superseded locally, and tell the operator "this booking no longer exists in GoHighLevel; it was cleared locally instead."
- If another non-superseded portal row for the same contact points at the same `ghl_appointment_id`, refuse the GHL cancel entirely and clear locally only.
- If GHL returns 404 for the event (already deleted), treat it as success: clear locally, no error toast.

### 4. Suppress contact-level workflow pushes for stale rows
When a decline is resolved as "stale row, no live GHL event", skip the decline tags, the GHL contact note, and the patient notification — those would otherwise message a patient whose new appointment is perfectly valid. The internal note records that the row was cleared as stale.

### 5. Queue hygiene
Exclude `is_superseded = true` rows from the Review Queue list query (the count query already does this, the list query does not), so a retired row can never reappear as actionable.

## Technical notes

- `supabase/functions/ghl-webhook-handler/index.ts` — `supersedeOlderContactRows` pending exemption; new delete-event branch in `extractWebhookData` / the main handler.
- `src/components/admin/ReviewQueue.tsx` — decline branch of `performAction` (ownership pre-check, stale-path short circuit), and the `fetch` list query needs the `is_superseded` filter.
- `src/utils/appointmentStatusChange.ts` — gains an optional "skip GHL push" flag for the stale path; single status path is preserved.
- `supabase/functions/update-ghl-appointment/index.ts` — return the event's current start time alongside the verified status so the caller can do the ownership check, and return a distinct `not_found` result for 404 instead of a generic error.
- No schema change required.

## What to check after

Rebooking a patient in GHL should drop the old row out of **New** on its own, a GHL-deleted appointment should disappear from the queue, and declining an outdated row should never touch the patient's newer appointment.
