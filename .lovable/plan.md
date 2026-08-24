# Text attempts get the full conversation outcome step

Right now the Text method offers only three attempt outcomes: Text Sent, Patient Responded, Message Failed / Undeliverable. "Patient Responded" is the text equivalent of "Patient Answered", so the wording is what's confusing — the labels don't make it obvious that a real conversation happened over text.

## What changes

1. **Clearer Text attempt outcomes** (Log Contact Attempt → Method: Text):
   - Text Sent — No Response
   - **Patient Answered (Responded)** — treated as real contact
   - Message Failed / Undeliverable
   - Wrong Number — same completion behavior as on Call (closes the record as Invalid / Wrong Number and blocks future outreach)

2. **Conversation Outcome step for Text**: choosing Patient Answered (Responded) shows the same required Conversation Outcome dropdown used for calls, with exactly the options in the screenshot:
   - Rescheduled / Booked (requires Booked / Rescheduled By, completes + credits the setter)
   - Follow-Up Required (opens Schedule Follow-Up)
   - Callback Requested (opens Schedule Follow-Up)
   - Not Interested (completes, blocks future recapture/reschedule outreach)
   - Other (requires a note, then Follow-Up Required or Completed)

3. **Email parity**: the same treatment for Email (Patient Answered (Responded) → conversation outcome), so all three methods behave identically after contact.

## Technical notes

- `src/components/recapture/types.ts`: relabel `text_responded` / `email_responded` to "Patient Answered (Responded)" and `text_sent` to "Text Sent — No Response"; add `wrong_number` to `RESULTS_BY_CHANNEL.text`. `CONTACT_RESULTS` already contains `text_responded` and `email_responded`, so the conversation-outcome gate needs no logic change.
- `src/components/recapture/LogAttemptDialog.tsx` and `RecaptureCaseDrawer.tsx` need no branching changes — the wrong-number completion path and conversation-outcome flow are already channel-agnostic.
- No database migration: existing `result` values stay the same, only labels and the per-method option lists change. Historical rows keep rendering through `RESULT_LABELS`.

## Validation

Open a recapture record, log Text → Patient Answered (Responded) → Follow-Up Required with a 30m quick interval and confirm the follow-up schedules exactly as it does for calls; then log Text → Wrong Number and confirm the record completes as Invalid / Wrong Number.
