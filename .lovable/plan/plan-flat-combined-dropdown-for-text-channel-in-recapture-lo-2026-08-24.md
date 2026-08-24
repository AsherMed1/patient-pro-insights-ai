# Plan: Flat Combined Dropdown for TEXT Channel in Recapture Log Attempt Dialog

## Goal
Replace the current two-step TEXT flow (Attempt Outcome → Conversation Outcome) with a single flat dropdown showing all options at once, as requested.

## Current Behavior (TEXT)
1. Method dropdown: Call / Text / Email
2. Attempt outcome dropdown (text): Text Sent, Patient Responded, Message Failed / Undeliverable, Wrong Number
3. If "Patient Responded" is selected → a **second** Conversation Outcome dropdown appears: Rescheduled / Booked, Follow-Up Required, Callback Requested, Not Interested, Other

## Desired Behavior (TEXT)
A **single** dropdown for the attempt outcome that includes both the attempt-level results AND the conversation outcomes in one flat list:

1. Text Sent
2. Patient Responded
3. Message Failed / Undeliverable
4. Wrong Number *(kept for terminal completion — removes patient from recapture)*
5. Rescheduled / Booked
6. Follow-Up Required
7. Callback Requested
8. Not Interested
9. Other

Selecting a conversation-outcome option (5–9) directly implies "Patient Responded" + that outcome — no second dropdown needed. "Patient Responded" alone means the patient responded but no specific resolution was recorded (record goes to Nurture).

Call and Email channels keep their existing two-step flow unchanged.

## Changes

### 1. `src/components/recapture/types.ts`
Add a `TextFlatOption` interface and a `TEXT_FLAT_OPTIONS` array that maps each flat option to its underlying `(result, conversationOutcome)` pair:

```ts
export interface TextFlatOption {
  value: string;
  label: string;
  result: AttemptResult;
  conversationOutcome: ConversationOutcome | null;
}

export const TEXT_FLAT_OPTIONS: TextFlatOption[] = [
  { value: 'text_sent',          label: 'Text Sent',                     result: 'text_sent',      conversationOutcome: null },
  { value: 'text_responded',     label: 'Patient Responded',             result: 'text_responded', conversationOutcome: null },
  { value: 'text_failed',        label: 'Message Failed / Undeliverable',result: 'text_failed',    conversationOutcome: null },
  { value: 'wrong_number',       label: 'Wrong Number',                  result: 'wrong_number',   conversationOutcome: null },
  { value: 'booked_rescheduled', label: 'Rescheduled / Booked',          result: 'text_responded', conversationOutcome: 'booked_rescheduled' },
  { value: 'follow_up_required', label: 'Follow-Up Required',            result: 'text_responded', conversationOutcome: 'follow_up_required' },
  { value: 'callback_requested', label: 'Callback Requested',            result: 'text_responded', conversationOutcome: 'callback_requested' },
  { value: 'not_interested',     label: 'Not Interested',                result: 'text_responded', conversationOutcome: 'not_interested' },
  { value: 'other',              label: 'Other',                         result: 'text_responded', conversationOutcome: 'other' },
];
```

### 2. `src/components/recapture/LogAttemptDialog.tsx`
- Add `flatTextValue` state (string) for the selected flat option.
- When `channel === 'text'`: render the single `TEXT_FLAT_OPTIONS` dropdown instead of the attempt-outcome + conversation-outcome dropdowns.
- On flat option select: set `result` and `conversation` from the mapped `TextFlatOption`, reset `otherResolution`.
- Conditional fields still appear for flat options:
  - **Wrong Number** → existing warning banner
  - **Rescheduled / Booked** → Booked By selector (required)
  - **Other** → "What happens next?" radio (required) + note (required)
  - **Follow-Up Required / Callback Requested** → triggers `needsScheduling` (Continue button → Schedule Follow-Up modal)
- Adjust validation in `submit()`:
  - For text flat mode, skip the `if (reached && !conversation)` check (since "Patient Responded" alone is valid).
  - Keep booked-by, note, and other-resolution validations for the relevant flat options.
- The existing `AttemptPayload` shape is unchanged — the parent (`RecaptureCaseDrawer`) needs no changes.

## Files Touched
- `src/components/recapture/types.ts` — add `TextFlatOption` + `TEXT_FLAT_OPTIONS`
- `src/components/recapture/LogAttemptDialog.tsx` — flat dropdown rendering + validation for text channel

## No Changes Needed
- `RecaptureCaseDrawer.tsx` — already handles `(result, conversationOutcome)` pairs correctly
- `recapture_attempts` / `recapture_cases` tables — payload shape is identical
