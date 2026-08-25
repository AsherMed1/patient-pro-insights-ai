# OON must apply the `oon pt` tag in GHL (both OON paths)

## Confirmed root cause

Your two GHL workflows (`OON status → GHL Appt Updates` and `OON PT - Cancel Appt in future`) both key off the contact tag:

```text
oon pt
```

Neither Portal OON path sends that tag:

- **Portal status dropdown → OON** (`src/utils/appointmentStatusChange.ts`): sends **no contact tag at all**. It only sets the status, cancels the GHL appointment, writes a note, fires `notify-slack-oon`, and fires `appointment-status-webhook`.
- **Review Queue → Mark OON** (`src/components/admin/ReviewQueue.tsx`): sends a contact tag, but the wrong one — `appointment-oon`, which exists only as a workflow-exit tag for the review-queue Wait step.

Because GHL only saw a plain appointment cancellation, the contact fell into the Needs to Reschedule branch instead of the OON workflow, and no OON message went out.

## Fix

Apply the same GHL contact tag set on **every** OON write path.

Tags to add:
```text
oon pt
do-not-reschedule
```

Tag to remove:
```text
reschedulable
```

### 1. Portal status dropdown (`appointmentStatusChange.ts`)
In the existing `status === 'OON'` block, push the tag set to the GHL contact via `update-ghl-contact-tags` using the project's `ghl_api_key` (same pattern the Do Not Call block already uses). Write an internal audit note listing the tags applied, and a clear failure note plus a non-blocking warning toast if the push fails — never block the status save.

### 2. Review Queue → Mark OON (`ReviewQueue.tsx`)
Change the tag payload from `['appointment-oon']` to add `oon pt` + `do-not-reschedule` and remove `reschedulable`. Keep `appointment-oon` as well, since the review-queue Wait step still listens for it.

### 3. Shared helper
Put the OON tag set in one place (a small exported helper next to `cancellationTags.ts`) so both paths, and any future OON writer, use identical tags.

Everything else stays as-is: OON still cancels/releases the GHL appointment, still fires the Slack alert and `appointment-status-webhook`, and Review Queue OON rows stay admin-only.

## Recovery for patients already stuck

One-off recovery pass (modeled on `backfill-review-exit-tags`) over recent records where `status = 'OON'` or `review_status = 'oon'` and a GHL contact ID exists:

- add `oon pt` + `do-not-reschedule`
- remove `reschedulable`
- write an internal audit note that recovery tags were applied

Batched with a small delay between GHL calls. Give me the patient's name/clinic and I'll run that one first as a check before the batch.

## Technical details

- Files: `src/utils/appointmentStatusChange.ts`, `src/components/admin/ReviewQueue.tsx`, new shared OON tag helper, one new recovery edge function.
- Reuses the existing `update-ghl-contact-tags` edge function; no schema changes.
- `update-ghl-appointment` STATUS_MAP stays unchanged (`OON → cancelled`) so the slot is still released.
- Memory rule to add after implementation: every OON write path must apply `oon pt` + `do-not-reschedule` and remove `reschedulable` on the GHL contact, or reject the write.
