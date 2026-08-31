# Keona Jordan (Emage Fibroid Centers) — what happened

## Findings (verified in the database)

There is exactly one portal record for this GHL contact (`LtVvYQOJKsGWTKLL4bMW`), Aug 20, 2026 3:30 PM, "Request your UFE Virtual Consultation". It is approved, not superseded, and visible — but the patient name on it is no longer "Keona Jordan".

Timeline on Aug 30, 2026 (UTC):

```text
17:24:05  Cancellation reason saved: "Not Interested Anymore", welcome call: No
17:24:07  Status Confirmed -> Cancelled          by portal user "Allahu AKbar"
17:24:10  GHL tags pushed: cancelled-portal, cancel-reason-not-interested, do-not-reschedule
17:24:22  Status Cancelled -> Confirmed          by the same user, 15 seconds later
17:26:16  Review Queue edit by the same user: name "Keona Jordan" -> "puta madre", DOB -> 1980-12-28
```

That account is `ricardo.l@patientpromarketing.com` (display name "Allahu AKbar"), an internal staff login.

So both symptoms have the same cause, and neither is a GoHighLevel sync problem:

- The cancel/instant reconfirm was a manual portal action by that user, not GHL.
- The clinic cannot find the patient because the record was renamed to "puta madre" — searching "Keona Jordan" returns nothing.

Side effect: the cancellation pushed `cancelled-portal`, `cancel-reason-not-interested` and `do-not-reschedule` tags to the GHL contact. Those tags were never removed when the record was reconfirmed 15 seconds later.

## Proposed remediation

1. Restore the record: `lead_name` back to "Keona Jordan", clear the DOB written during that edit (unless the clinic confirms 12/28/1980 is real), and clear the stale cancellation reason / welcome-call fields left from the 15-second cancellation.
2. Add an internal note documenting the correction so the history reads honestly.
3. Remove the three cancellation tags from the GHL contact so GoHighLevel no longer shows the patient as cancelled / do-not-reschedule.
4. Confirm with you what the appointment's final status should be (it currently reads Confirmed for a past Aug 20 date).

## Safeguards to consider

- Log patient-name changes made from the Review Queue as internal notes on the record itself, not only in the admin audit log, so a renamed patient is traceable from the record.
- When a status change is reversed within a short window (e.g. Cancelled -> Confirmed inside 5 minutes), automatically retract the cancellation tags that were pushed to GHL instead of leaving the contact tagged as cancelled.
- Review the access level of the `ricardo.l@patientpromarketing.com` account, since these edits landed on a live clinic record.

## Technical detail

- Data fix: update `all_appointments` row `c574bbd8-f326-4158-a3b9-8cfa934789d9` (name, DOB, cancellation fields, status per your answer) and insert an `appointment_notes` internal row.
- Tag cleanup: call `update-ghl-contact-tags` for contact `LtVvYQOJKsGWTKLL4bMW` with the Emage project key to remove the three cancellation tags.
- Safeguards touch `src/components/admin/ReviewQueue.tsx` (name-change note) and `src/utils/appointmentStatusChange.ts` (reversal tag retraction). No schema change.
