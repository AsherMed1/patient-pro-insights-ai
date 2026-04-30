## Status: Partially resolved — code path is in place, but Toshana's case reveals a gap

### What's confirmed working in the deployed code

`AppointmentCard.tsx` (line 612) and `DetailedAppointmentView.tsx` define `NO_RESCHEDULE_REASONS`. **"Not Interested Anymore"** is on that list. When a user selects it, the code:

1. Saves `cancellation_reason = 'Not Interested Anymore'` to `all_appointments`.
2. Logs an internal note.
3. Sets the appointment to Cancelled and syncs that to GHL.
4. Calls `update-ghl-contact-dnd` to flip the GHL contact's DND flag to `true` across Call/Email/SMS/WhatsApp/GMB/FB.

Toshana McDonald's record (`bZuGibzUeB7NvwtanzMZ`, Ventra) confirms the portal saved `cancellation_reason = 'Not Interested Anymore'` and Cancelled status on Apr 24.

### Where the gap is

I queried `update-ghl-contact-dnd` edge function logs for both her GHL contact ID and her name — **zero log entries for that function for her contact**. Two possibilities:

1. The DND call ran before logs rotated out of retention (Apr 24 → today), so we can't prove it fired.
2. The DND call fired and succeeded, but the **GHL "reschedule pipeline" workflow on the Ventra sub-account does not check the contact's DND flag before enrolling the lead**. GHL workflows only respect DND if the workflow is explicitly configured with "Don't enroll DND contacts" or has a DND filter step.

The portal does its job (flips DND on the GHL contact). The reschedule pipeline still pulled her in because the GHL workflow doesn't gate on DND.

### Proposed fix — two layers

**Layer 1 (code, portal-side reinforcement):** in addition to setting DND on the contact, also **add a GHL tag** like `do-not-reschedule` to the contact whenever a `NO_RESCHEDULE_REASONS` cancellation is submitted. Tags are the standard GHL primitive workflows filter on, and they're more reliable than DND for reschedule-pipeline gating.

- New edge function `update-ghl-contact-tags` (or extend `update-ghl-contact-dnd`) that POSTs to `https://services.leadconnectorhq.com/contacts/{id}/tags` with `{ tags: ['do-not-reschedule'] }`.
- Call it from `handleCancelSubmit` in `AppointmentCard.tsx` and the equivalent block in `DetailedAppointmentView.tsx` whenever `NO_RESCHEDULE_REASONS.includes(cancelReason)`.
- Also remove the tag if the user later changes the reason to an `ALLOW_RESCHEDULE_REASONS` value (defensive).

**Layer 2 (GHL config, one-time per sub-account):** the Ventra reschedule workflow needs a filter step that **excludes contacts with the `do-not-reschedule` tag** (and/or with DND = true). This must be done in GHL by the admin — code cannot reach into the workflow definition.

**One-off cleanup for Toshana:** push the `do-not-reschedule` tag to her GHL contact now and re-run the DND PUT so her record is correctly flagged in GHL going forward. The portal record itself is already correct.

### Out of scope

- No DB migration.
- No change to `cancellation_reason` field structure.
- The duplicate appointment row (No Show, id `5106…`) is unrelated to this issue and stays as-is.

### Technical summary

| Change | Where | Type |
|---|---|---|
| New edge function `update-ghl-contact-tags` | `supabase/functions/update-ghl-contact-tags/index.ts` | New |
| Call tag function on no-reschedule cancellations | `AppointmentCard.tsx` ~L680, `DetailedAppointmentView.tsx` ~L1347 | Edit |
| One-off: tag + DND for Toshana's GHL contact | Direct GHL API call via edge function | One-off |
| GHL workflow filter on `do-not-reschedule` tag | GHL admin UI, Ventra sub-account | Manual (out of code) |

Approve to proceed with the code changes + one-off cleanup, plus a Slack-ready note for the GHL admin describing the workflow filter to add?