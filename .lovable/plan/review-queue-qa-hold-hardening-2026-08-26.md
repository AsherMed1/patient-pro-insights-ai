# Review Queue — QA Hold hardening

Four changes to the QA Hold bucket and the Potential OON safeguard.

## 1. Remove "Back to New" in QA Hold

Records in QA Hold are setter-booked (they were already auto-approved and pulled back for insurance verification), so "New" is never the right destination. The stage-move button will be hidden when the QA Hold bucket is active; New/Pending Review keep their current toggle.

## 2. No confirmation text/email until QA Hold is approved

Today a setter-submitted booking is auto-approved and the `approved` tag is pushed to the GHL contact immediately — that tag is what releases the GHL confirmation message. The Potential OON evaluation runs *after* that, so a record can be pulled into QA Hold when the patient has already been messaged.

Fix: in `ghl-webhook-handler`, run the Potential OON evaluation **before** the setter-submitted `approved` tag push and skip the tag when the record comes back flagged (`heldForQA`). The reviewer's Approve in the Review Queue already pushes `approved`, so the confirmation goes out at that point instead — after verification.

## 3. Lock actions while "Potential OON" is unresolved

`Log attempt`, `Approve` and `OON` become disabled (greyed, with an explanatory tooltip) whenever a row carries an unresolved Potential OON flag. They re-enable as soon as a reviewer picks **Verified in network**. `Confirm OON` and `Decline` stay available. Approve already had a server-side guard; this makes the button state match it.

## 4. "Confirm OON" must fire the GHL OON workflow

The Review Queue OON path currently adds only the `appointment-oon` exit tag and relies on the project's outbound webhook to apply `oon pt`. When that automation does not land the tag, the client's `OON PT - Cancel Appt in future` workflow never enrolls — GHL just shows a plain cancellation and no OON message goes out.

Fix: push both `appointment-oon` and `oon pt` from the Review Queue OON path (tag adds are idempotent, so a project whose webhook also applies `oon pt` is unaffected). The GHL appointment itself is still left untouched so the workflow can cancel it and send the patient message — matching the rule that OON is GHL-workflow-owned. An internal audit note will record which tags were applied.

## Technical details

- `src/components/admin/ReviewQueue.tsx`
  - hide the `Pending Review` / `Back to New` stage button when `queueView === 'qa_hold'`
  - `disabled={isOonBlocked(row)}` + tooltips on Log attempt, Approve, OON
  - OON side-effect block: `tags: ['appointment-oon', 'oon pt']`, plus an internal note
- `supabase/functions/ghl-webhook-handler/index.ts`
  - await `evaluate-potential-oon` before the setter-submitted tag block; skip the `approved` tag push (and its verify/stamp) when the result reports the row was held for QA
- No schema changes.
