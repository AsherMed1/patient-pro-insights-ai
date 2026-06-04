## Context

Gary Jones (TVI) is a single `all_appointments` row (`a3d51f2f…`) with `ghl_appointment_id = XvS5dqieAlgwSSHOpifP`. The setter did **not** create a new GHL appointment when they "fixed" the booking — they edited the existing one in GHL, so the webhook updated the same row in place (calendar flipped from GAE → PAD). There is only ever one row for this patient.

That's why:
- "The old appointment isn't being overwritten by the new one" — there is no new appointment ID; it's the same row mutated.
- "When I restore it, the old appointment comes back" — the row that comes back is the same (now-PAD) row, just with stale GAE wording in the calendar title that the setter never fully corrected in GHL.
- "No way to remove the old appointment" — Declined view only offers Restore today.

The existing review system **is already keyed per `all_appointments.id` (per ghl_appointment_id)**, so a brand-new GHL appointment with a different id would already create a separate review row. The real gaps are: (1) no way to permanently dismiss an obsolete declined row, and (2) when GHL edits an appointment in place after a decline, the declined snapshot is lost because the same row gets mutated and re-opened.

## Plan

### 1. Add a "Dismiss permanently" action in the Declined view
In `src/components/admin/ReviewQueue.tsx`, alongside **Restore to Review Queue**, add a **Dismiss** button (with confirm dialog) for declined rows. It will:
- Set `all_appointments.review_status = 'dismissed'` (new terminal value), keep `reviewed_at`/`reviewed_by`.
- Insert `appointment_review_history` with `action = 'dismissed'`, `prior_status = 'declined'`, actor info, optional note.
- Audit-log `review_dismissed`.
- Hide the row from both Pending and Declined views (filter `review_status IN ('pending')` and `('declined')` respectively).

No GHL side effects. This gives admins a one-click way to clear obsolete declined rows like Gary's old GAE snapshot.

### 2. Freeze the declined snapshot so GHL edits don't mutate it
Update `supabase/functions/ghl-webhook-handler/index.ts` so that when an inbound GHL update matches an `all_appointments` row whose `review_status IN ('declined','dismissed')`:
- Do **not** mutate the declined row's calendar / date / status / parsed fields.
- Instead, **insert a new `all_appointments` row** for the same `ghl_appointment_id` + lead (mark the declined one `is_superseded = true`, link via existing supersede pattern), with `review_status = 'pending'` so it appears as a fresh entry in the queue.
- Exception: if the GHL payload is a pure status flip to `Cancelled`/`No Show`/`Do Not Call` on the declined row, keep current behavior (no new row, no mutation).

Result: every meaningful GHL change after a decline produces a new queue entry with its own audit trail, while the original declined row stays frozen and history-accurate. This satisfies the user's "decline only the specific appointment ID" requirement — the declined snapshot is now truly immutable per appointment id + revision.

### 3. Auto-re-open guard
The webhook currently re-opens `declined → pending` when GHL sends a new `date_of_appointment` for the same id (lines 865–873). Replace this with the new-row insert from step 2 so re-opens go through the snapshot-then-insert path consistently.

### Verification
- Open Declined → Gary Jones row shows **Restore** and **Dismiss**. Dismiss removes it from both tabs; `appointment_review_history` shows `dismissed`.
- Decline an appointment, then in GHL change its calendar or date → a new pending row appears in Review Queue; the original declined row stays declined with original calendar/date intact and `is_superseded = true`.
- Decline + cancel in GHL → declined row stays as-is, no duplicate created.
- Restore still works on rows that have not been superseded.

### Files touched
- `src/components/admin/ReviewQueue.tsx` — Dismiss button, action handler, query filter, count.
- `supabase/functions/ghl-webhook-handler/index.ts` — snapshot-preserving branch when target row is declined/dismissed; replace existing auto re-open block.
- No schema migration required (`review_status` and `action` are free-text; `is_superseded` already exists).
