# Auto-decline Review Queue rows cancelled in GHL

When GoHighLevel cancels an appointment that is still sitting in the Review Queue (New or Pending Review), the row must leave the queue and land in the **Declined** bucket instead of staying there for setters to work.

## Behavior

- A GHL webhook that moves an appointment to **Cancelled** (or **No Show**) while its review status is still pending will:
  - Move the record to the **Declined** bucket.
  - Stamp the decline reason as "Cancelled in GoHighLevel" and the reviewer as "GoHighLevel" with the current time, so the Declined tab shows why it left.
  - Write an internal (team-only) note: `Auto-declined — appointment was cancelled in GoHighLevel — {timestamp}`.
- No GHL cancellation is pushed back and **no patient SMS/email tags are added** — the appointment is already cancelled in GHL, and the patient-facing decline messaging should not fire for a cancellation the clinic/patient already made.
- The record can still be restored from the Declined tab exactly like a manual decline (Restore returns it to New).
- Approved and already-declined rows are untouched; only rows with review status `pending` are auto-declined.
- One-time cleanup: existing rows still pending in the queue whose status is already Cancelled or No Show (like the "THIS IS A TEST TEST" example) get moved to Declined the same way.

## Technical notes

- Change lives in `supabase/functions/ghl-webhook-handler/index.ts`, in the existing-appointment update path where `updateFields.status` is set from the GHL payload. When the incoming status normalizes to `Cancelled` / `No Show` and `existingAppointment.review_status === 'pending'`, also set `review_status = 'declined'`, `review_stage = null`, `decline_reason = 'cancelled_in_ghl'`, `reviewed_by = 'GoHighLevel'`, `reviewed_at = now()`.
- Add a hidden `cancelled_in_ghl` entry to `DECLINE_REASONS` in `src/components/admin/declineReasons.ts` (label "Cancelled in GoHighLevel", `reschedulable: false`, `hidden: true`) so the Declined tab renders a friendly label and it never appears in the setter dropdown.
- The internal note is inserted alongside the existing `statusChangeNote` insert with `created_by: 'System'`, `visibility: 'internal'`.
- Cleanup is a data update over `all_appointments` where `review_status = 'pending'` and `status` in ('Cancelled','Canceled','No Show') — same field set as above.
