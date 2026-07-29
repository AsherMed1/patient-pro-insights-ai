## What exists today

In the Review Queue decline flow (`ReviewQueue.tsx` + `declineReasons.ts`), declining requires a reason, cancels the appointment, writes a GHL contact note, and adds two tags: the generic `appointment-declined` plus a reason-specific tag (`declined-not-interested`, `declined-criteria`, `declined-other`, etc.). "Other" already requires an explanation.

What does **not** exist: any notion of reschedule intent. Nothing in the portal tells GHL whether the patient should be rescheduled, and "Other" has no follow-up choice. So this is new work — on both the portal and the GHL side.

## Change 1 — reschedule intent per reason (`declineReasons.ts`)

Add a `reschedulable: boolean | null` field to each reason:
- `not_interested` → `false`
- `criteria` → `false`
- `missing_insurance`, `booking_rule`, `unverified`, `patient_cancelled` → `true`
- `other` → `null` (setter must choose)

Add two new tag constants:
- `RESCHEDULE_TAG = 'declined-reschedule'`
- `NO_RESCHEDULE_TAG = 'declined-no-reschedule'`

## Change 2 — "Other" sub-choice in the decline dialog (`ReviewQueue.tsx`)

When the selected reason is "Other", show a required radio group under the explanation box:
- Patient needs to be rescheduled
- Patient should not be rescheduled

Confirm stays disabled until reason + explanation + this choice are all set. State resets on cancel/close, and the same control applies to bulk decline.

## Change 3 — tag push and record keeping

On decline, resolve the effective intent (reason's `reschedulable`, or the "Other" radio choice) and push exactly one of `declined-reschedule` / `declined-no-reschedule` alongside the existing generic + reason tags. Append the decision to the GHL contact note and the portal note ("Reschedule: yes/no"), and store it on the appointment (reuse `decline_reason`-adjacent metadata: save as `other_needs_reschedule` / `other_no_reschedule` variants of the reason value so no migration is needed, and show it in the Declined tab).

## What you must do in GHL

1. Create two new tags: `declined-reschedule` and `declined-no-reschedule`.
2. Change your rescheduling workflow trigger from "Contact Tag Added = appointment-declined" to **"Contact Tag Added = `declined-reschedule`"**. That single change enforces the whole rule — "no longer interested" and "does not meet clinic criteria" will never carry that tag, and "Other" only carries it when the setter picks "needs to be rescheduled".
3. Optionally build a separate closing/no-reschedule workflow on `declined-no-reschedule`.
4. Leave the existing per-reason messaging workflows as they are — they keep firing on their own tags.

## Technical notes

- Only frontend files change: `src/components/admin/declineReasons.ts` and `src/components/admin/ReviewQueue.tsx`.
- No database migration; the existing `decline_notified_at` duplicate guard still ensures tags fire exactly once per decline.
- Restore continues to clear decline metadata so a re-decline can re-notify.
