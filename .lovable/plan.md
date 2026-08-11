# Dale Martin (Ozark) — why the appointment notes "disappeared"

## What actually happened

Dale Martin has three appointment rows in the portal, all for the same GHL contact and the same GAE Rogers calendar:

| Portal record | Appointment date | Status | State |
|---|---|---|---|
| cbe5a93b | Feb 27, 2026 | No Show | superseded |
| 9d6a938d | Aug 5, 2026 | No Show | superseded (Aug 7) |
| b3a14192 | **Jan 1, 2027** | Confirmed | active record the clinic is looking at |

Every internal note the team wrote — the welcome-call note from Banessa Patolzin (Jul 15), "we have records on file", "023631 ADDED TO STREAMLINE", the QA approval note — is attached to the **Aug 5 record (9d6a938d)**. When GHL re-booked the patient to Jan 1, 2027 on Aug 7, the system created a brand-new record and marked the Aug 5 one superseded. Superseded rows are hidden from the client portal, so the notes went with it.

The new Jan 1, 2027 record only carries one system note ("approved tag added…"). Nothing was lost — the notes are still in the database on the older record.

The Jan 1 2027 date is not the cause. Patient Intake Notes and the parsed cards (demographics, insurance, pathology, imaging) are all present on the new record.

## The gap to close

When a rebooking supersedes an older row, the internal notes stay behind. There is no note carry-over and no way for the clinic to see the earlier record's notes from the active one.

## Proposed fix

1. **Carry notes forward on supersede.** In `ghl-webhook-handler`, when older rows for a contact are superseded, copy their human-authored notes (skip System notes) onto the new active row, prefixed with the original author and the old appointment date so attribution and timing stay clear.
2. **Backfill Dale Martin.** Copy the four human notes from record 9d6a938d onto b3a14192 so the clinic sees them now.
3. **Optional (recommend):** show a "Notes from previous booking" section on the appointment record when superseded siblings exist, so history is always reachable without duplicating rows.

Items 1 and 2 are the core fix; item 3 is a UI addition — confirm if you want it.

## Technical notes

- Supersede logic lives in `supersedeOlderContactRows()` in `supabase/functions/ghl-webhook-handler/index.ts` (~line 1960-2030). It flips `is_superseded` and writes a System note on the old row; it does not touch `appointment_notes` of the old row otherwise.
- Carry-over would insert copies into `appointment_notes` for the new `appointment_id` with `created_by` preserved and text prefixed `[from Aug 5, 2026 booking]`.
- Backfill runs as a one-off insert for the four non-System notes on 9d6a938d.

## Draft ticket reply

> Checked this one — the Jan 1, 2027 date isn't the issue. Dale was rebooked in GHL on Aug 7 from his Aug 5 appointment to Jan 1, 2027, which created a new appointment record in the portal. All the notes the team added (welcome call notes from Jul 15, "records on file", the Streamline entry) are attached to the older Aug 5 record, which is now retired and hidden from the clinic view — so the new record looks empty.
>
> Nothing was lost. We're copying those notes onto the current Jan 1, 2027 record now, and we're updating the system so notes automatically carry forward whenever a patient is rebooked, so this doesn't happen again.
>
> Patient Intake Notes and the parsed demographics/insurance/pathology are all populating correctly on this account.
