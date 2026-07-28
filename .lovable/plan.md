## Goal

When a setter declines an appointment in the Review Queue, require a standardized reason, then automatically cancel the appointment through the **same** status-change logic the rest of the portal uses, sync GHL, note the reason on the GHL contact, and tag the contact so the reason-appropriate SMS/email workflow fires in GHL — exactly once.

## 1. Extract the single cancellation path (no parallel workflow)

Today the canonical status change lives inline in `AllAppointmentsManager.updateAppointmentStatus` (DB update → `update-ghl-appointment` sync → system note → per-status side effects). The Review Queue has no access to it.

- Move that function body into a shared module `src/utils/appointmentStatusChange.ts` exporting `changeAppointmentStatus({ appointmentId, newStatus, userName, ... })`, preserving current behaviour byte-for-byte (procedure_ordered rules, IPC rules, GHL sync + warning toasts, "Status changed from X to Y by {user}" note, Do Not Call / OON branches).
- `AllAppointmentsManager` calls the shared function instead of its inline copy — no behaviour change for existing cancels.
- The Review Queue decline calls the same function with `newStatus: 'Cancelled'`. This is the only way declines cancel.

## 2. Decline reason dialog

Replace the free-text decline dialog in `src/components/admin/ReviewQueue.tsx` with a required reason selector:

- Patient is no longer interested
- Missing or incomplete insurance information
- Patient does not meet clinic criteria
- Booking-rule violation
- Unable to verify patient information
- Patient requested cancellation
- Other — requires an explanation

Rules: Confirm is disabled until a reason is picked; if **Other**, the notes textarea is mandatory and non-empty. Optional notes allowed on every reason. The same dialog gates the **bulk** Decline action (one reason applied to the selection). OON dialog is untouched.

## 3. What happens on submit

Inside the existing `performAction(id, 'declined', ...)` — extended, not duplicated:

1. Save `review_status='declined'`, `reviewed_at`, `reviewed_by`, `review_notes` (reason + explanation), and a new `decline_reason` column for clean reporting.
2. Call the shared `changeAppointmentStatus(..., 'Cancelled')` → DB status, GHL appointment status sync, system status-change note.
3. Insert an appointment note: `Declined: {reason}{ — explanation} by {setter name} - [[timestamp:…]]`.
4. Write the same text as a **GHL contact note** (new edge function `add-ghl-contact-note`, posting to the GHL contact notes endpoint using the project's `ghl_api_key`), including setter name and local date/time.
5. Add a per-reason GHL tag to the contact via the existing `update-ghl-contact-tags` function, e.g. `declined-not-interested`, `declined-missing-insurance`, `declined-criteria`, `declined-booking-rule`, `declined-unverified`, `declined-patient-cancelled`, `declined-other`. Your GHL workflows keyed on these tags send the reason-appropriate text + email. (A generic `appointment-declined` tag is added alongside so one workflow can catch everything.)
6. Existing `appointment_review_history` + `log_audit_event` entries continue to record the action, now with the reason in metadata.

No DND and no `do-not-reschedule` tag on any decline — patients stay reachable.

The row stays `review_status='declined'`: hidden from every client portal, visible only in the Review Queue → Declined tab (which already shows the decline reason), still restorable.

## 4. Duplicate-notification prevention (hard requirement)

- New column `decline_notified_at`. The GHL note + tag step runs only when it is null; it is stamped on success.
- Declining a row already `status='Cancelled'` skips the cancel step (no second status-change note, no second GHL cancel push).
- Re-declining a restored row: because Restore clears `decline_reason`/`decline_notified_at`, a genuine second decline notifies again — an accidental double-click or bulk overlap does not.
- Bulk decline de-dupes IDs and processes sequentially so the guard is authoritative.

## 5. Reporting

`decline_reason` is a first-class column, so declines can be grouped by reason and clinic. Reasons stay separate from the existing `cancellation_reason` list; `cancellation_reason` is left untouched by declines.

## Technical notes

- Migration: `ALTER TABLE public.all_appointments ADD COLUMN decline_reason text, ADD COLUMN decline_notified_at timestamptz;` plus an index on `decline_reason` for reporting. No new tables, so no new grants/RLS needed.
- New edge function `add-ghl-contact-note` (project-scoped `ghl_api_key`, CORS, validated body, surfaces GHL status/body on failure). GHL-side failures are non-fatal: the decline + cancel still commit, and the setter sees a "saved, GHL note failed" toast.
- Restore path in `ReviewQueue.tsx` also clears `decline_reason` and `decline_notified_at`.
- No changes to `ghl-webhook-handler`; declined rows remain frozen snapshots.
