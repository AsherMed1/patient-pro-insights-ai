# Review Queue Decline — make the GHL cancellation and patient message actually fire

## What the data shows (verified)

Fahrije Saiti (The Painless Center, GHL contact `aePxDLgH6TFDrnpZac6l`, appointment `15F69LhBVFCd13zReQjy`):

- Portal row is `status = Cancelled`, `review_status = declined`, reason `patient_cancelled`, declined Aug 14 18:15 UTC.
- The row was **already** set to Cancelled at 15:47 UTC by a GoHighLevel status event, before the setter declined it.
- The decline code skips the GHL cancellation push whenever the portal row is already Cancelled. So nothing was ever pushed back to GHL, and GHL still shows the appointment Confirmed for Aug 25.

Across the last 30 days of declines (201 records):

- **156** were already `Cancelled` in the portal at decline time, so the GHL cancel push was skipped for all of them.
- **69** have no `decline_notified_at` despite having a GHL contact, i.e. the decline tag/note push never completed (54 of those have no decline reason stored — older declines, before the reason flow).

That skip is the desync: the portal thinks it cancelled, GHL keeps the slot confirmed and keeps sending confirmation texts.

## Fix

### 1. Always push the cancellation to GHL on decline
Remove the "already Cancelled locally, skip" short-circuit. On every decline:
- Send the cancellation to GHL through the canonical status path regardless of the local status value.
- If the local status is already Cancelled, skip only the duplicate portal status note — not the GHL call.

### 2. Verify the push instead of assuming it worked
After the cancel call, read the appointment back from GHL and confirm it is `cancelled`.
- Success: write an internal note "Cancellation confirmed in GoHighLevel".
- Failure: block the success toast, show a red "Not cancelled in GHL" toast with the provider error, and leave the record flagged so it can be retried.

### 3. Retry action for the records already out of sync
Add a "Retry GHL cancel" button on rows in the Declined tab whose GHL cancellation was never confirmed, so setters can push the 156 stuck records without re-declining them. Run a one-off backfill sweep for the declined-in-the-last-30-days set and report how many GHL appointments were actually still open.

### 4. Always fire the patient notification
The tag push is currently gated on `decline_notified_at` being empty **and** a GHL contact existing. Keep the duplicate guard, but:
- Treat a failed tag push as a hard failure surfaced in the dialog, not a passing toast.
- Record the specific tags pushed in the internal note so it is auditable which workflow should have fired.
- Fahrije's contact will be re-pushed as part of the backfill.

### 5. Reschedule choice per cancellation reason
Today only "Other" asks the setter. Change the decline dialog so **every** reason shows a "Patient needs to be rescheduled? Yes / No" control, pre-selected from the reason's default (e.g. "no longer interested" defaults to No, "missing insurance" defaults to Yes) and overridable per case. The chosen value drives which of `declined-reschedule` / `declined-no-reschedule` is pushed, so the clinic's reschedule workflow only fires when the setter says so.

## Technical notes

- `src/components/admin/ReviewQueue.tsx` — decline branch of `performAction` (the `status !== 'cancelled'` guard), decline dialog state, Declined-tab row actions.
- `src/utils/appointmentStatusChange.ts` — keep as the single status path; add an optional "force GHL push" flag.
- `supabase/functions/update-ghl-appointment/index.ts` — return the post-update GHL appointment status so the caller can verify rather than trust a 200.
- `src/components/admin/declineReasons.ts` — `reschedulable` becomes the default for the new toggle rather than a fixed value; the stored `other_reschedule` / `other_no_reschedule` variants stay for backwards compatibility.
- No schema change required; a `decline_ghl_cancel_confirmed_at` column is added only if we want the retry button to persist its state across sessions (recommended).

## What to check after
Fahrije Saiti's GHL appointment should flip to Cancelled, the Aug 25 slot should free up, and the decline tags should appear on her contact.
