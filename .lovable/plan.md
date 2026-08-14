# Clinic-visible lifecycle activity vs. truly internal notes

## Where things stand (verified)

Partly done, but not fully.

Already working:
- Portal status changes ("Status changed from X to Y by {user}") are written clinic-visible and were backfilled.
- GHL-driven notes (author `GoHighLevel`) — reschedules, Welcome Call transitions, other status changes — are stored `visibility = clinic` (2,067 rows) and clinics can see them.
- Team users can flip any note between Clinic visible / Internal from the note badge.

Still a gap:
- The notes UI hides **every** note authored by `System` from anyone who isn't an admin — clinics *and* agents/VAs — regardless of its `visibility` value. There are 5,951 `System` notes marked `clinic` that no clinic user can actually see.
- Clinic-relevant events are written under that `System` author and therefore invisible to clinics:
  - Cancellation reason + Welcome Call completed (written on cancel from the appointment card and detail view)
  - "Appointment date/time re-synced from GoHighLevel | FROM … | TO …"
  - "Service changed from X to Y in GoHighLevel"
  - Short Notice auto-applied
- Genuinely internal `System` events that must stay hidden: superseded/duplicate-record notes, GHL tag pushes ("approved" tag added…), Review Queue workflow notes, QA/escalation chatter.

## Change

1. Stop hiding notes by author. Clinic visibility is decided by the `visibility` column only, so a note is clinic-facing when it says so — no more "one internal note hides all system activity". `System` notes keep their blue styling.
2. Classify system-generated writes explicitly at the point they are created:
   - Clinic-visible: cancellation reason / Welcome Call answer, date-time re-sync, service change, short-notice applied.
   - Internal: superseded / duplicate-record notes, GHL tag-push audit lines, Review Queue workflow notes, reschedule-block admin notes.
3. Backfill existing `System` notes to match that classification, so history reads correctly for clinics (superseded / tag-push / queue notes flipped to internal; the clinic-relevant ones left clinic-visible).
4. Team users keep the per-note toggle to override any note either way.

## Technical notes

- `src/components/appointments/AppointmentNotes.tsx`: drop the `created_by !== 'System'` role filter; keep `visibility` filtering for clinic users and keep the blue System styling and `Auto` badge.
- Add `visibility` explicitly on inserts in: `src/components/appointments/AppointmentCard.tsx` (cancel note → clinic), `src/components/appointments/DetailedAppointmentView.tsx` (cancel note → clinic), `src/components/appointments/cancellationTags.ts` (tag audit → internal), `src/utils/rescheduleBlock.ts` (→ internal).
- Edge functions: `sync-ghl-appointment-times` (→ clinic), `sweep-short-notice-pending` (→ clinic), `ghl-webhook-handler` service-change note (→ clinic) and the two superseded/duplicate notes (→ internal), `update-ghl-contact-tags` (→ internal).
- Data-only backfill (insert tool, no migration): set `visibility='internal'` for `System` notes matching superseded/duplicate, tag-push, and Review Queue workflow text patterns; leave the rest `clinic`.
- No schema or RLS change — the `visibility` column and policies already exist.
