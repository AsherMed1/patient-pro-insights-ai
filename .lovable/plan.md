# Kiava Stewart (EMAGE) — why she isn't in the portal

## What the record shows

The appointment exists in the system but was never released to the clinic.

- Patient: Kiava Stewart, Emage Fibroid Centers
- Calendar: Request your UFE Virtual Consultation
- Appointment: Aug 10, 2026 at 2:00 PM
- Created: Aug 8, 2026
- Current status: Cancelled
- Review state: still `pending`, in the "Pending Review" bucket

Timeline from the record's own notes:

```text
Aug 8  13:30  Booking created, lands in Review Queue (New)
Aug 8  16:51  Staecy Pena moves it to "Pending Review" (not approved)
Aug 10 12:50  Clinic block 9-5 routed around this appointment
Aug 10 13:52  GoHighLevel changes status Confirmed -> Cancelled
```

Root cause: appointments are hidden from every client portal until a reviewer clicks Approve. This one was moved to Pending Review for follow-up and never approved, so the clinic never saw it. It was then cancelled in GHL on the day of the appointment.

## Proposed handling

1. Confirm with the review team what the Pending Review follow-up was waiting on (nothing was written in the notes beyond the move).
2. Decide the disposition:
   - If the cancellation is correct: leave it, and reply to the ticket explaining it was cancelled in GHL on Aug 10 and never approved for portal visibility.
   - If the clinic should still see it: approve the record from the Review Queue so it becomes client-facing (it will appear under the Cancelled/Completed view given its current status).
3. Optional follow-up to prevent repeats: add an aging indicator to the Pending Review bucket so records sitting unapproved past their appointment date get surfaced (e.g. a count badge plus an "overdue in review" highlight). No status is changed automatically.

## Suggested ticket reply

> Kiava Stewart's Aug 10 UFE virtual consult is in our system, but it was held in the Review Queue's Pending Review bucket on Aug 8 and never approved, which is why it never became visible in the portal. On Aug 10 at 9:52 AM the appointment was cancelled in GHL. If you'd like it visible to the clinic anyway, we can release it now.

## Technical notes

- Record ID: `fb9518c7-36a4-4387-b363-74c43281b5d5`, GHL contact `SbiOUTp6Bnfi692R42XT`.
- Visibility gate is `review_status = 'pending'`; portal views only show approved, non-superseded rows. The row is not superseded and has no OON flag.
- Step 3, if wanted, is a UI-only change in the Review Queue (Pending Review list) — no schema or status-logic changes.
