# Ashley Caldwell — why a patient with no appointment is in the Richmond portal

## What happened

Her record (`f160ed1a`, Richmond Vascular Center) was created on **Jan 30, 2026** and has:

- no `ghl_appointment_id` — nothing was ever booked in GHL
- `calendar_name = "Unknown"`, no date, no time
- `status = Confirmed`, `review_status = approved` — so it is fully visible to the clinic
- intake notes that are a **contact-only GHL payload**: a partially completed "UFE STEP 1" form (three pathology answers, phone, DOB, insurance "Other"). No appointment block at all.

So this is not a lost appointment. GHL fired a **contact/form-submission webhook** (no appointment object), and the webhook handler at the time turned that contact into an appointment row, defaulted the status to Confirmed, and it was auto-approved into the client portal. It is the only Richmond record in this state out of 1,019 — the current handler has since gained guards (`isLikelyNotesOnlyPayload`, the `hasRealDate` guard, review-queue gating), which is why nothing newer looks like this.

She is also the same record behind the clinic's "patients with no date and time" report.

## Plan

### Step 1 — Resolve the record
- Retire Ashley Caldwell's row from the clinic-facing portal (mark it superseded/dismissed rather than hard-deleting, so the intake data and audit trail survive).
- Add a system note explaining it was a contact-only form submission with no booked appointment.
- Before retiring, check GHL contact `FBbFcQWsaHNz5QOMDVyM` for a later booking; if one exists, link/restore instead of retiring.

### Step 2 — Close the gap that let it through
- In `ghl-webhook-handler`, refuse to create a new `all_appointments` row when the payload has no appointment identity at all: no `ghl_appointment_id`, no date, and `calendar_name` unresolvable ("Unknown") — unless the project is a known unscheduled-capture project (Premier Vascular, ECCO Medical, Davis Vein & Vascular, Horizon Vascular Specialists), which Richmond is not.
- Such payloads should enrich an existing row for the same contact if one exists, and otherwise be logged and dropped rather than becoming a phantom patient.

### Step 3 — Sweep for the same pattern portfolio-wide
- Find every non-unscheduled-project row with no `ghl_appointment_id`, no date, and `calendar_name = 'Unknown'` that is currently approved/visible.
- Produce that list for review before any bulk action, then retire the confirmed phantoms the same way as Step 1.

## Technical notes

- Files: `supabase/functions/ghl-webhook-handler/index.ts` (creation path around the `isLikelyNotesOnlyPayload` check, line ~278, and the new-appointment insert at ~447).
- Step 1 and Step 3 are data changes on `all_appointments` plus `appointment_notes` inserts; no schema migration needed.
- The Richmond timezone/display issues found earlier (portal formats dates in Central while Richmond is US/Eastern) are a separate item and are not part of this plan.
