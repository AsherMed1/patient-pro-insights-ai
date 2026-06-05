# Add "approved" GHL tag for Setter Submitted auto-approvals

## Background

Admin manual approvals from the Review Queue already add an `approved` tag to the GHL contact via `update-ghl-contact-tags` (see `src/components/admin/ReviewQueue.tsx`, lines 252–292).

The other path that creates an auto-approved appointment — the GHL webhook detecting `Insurance Intake Source = "Setter Submitted"` and inserting with `review_status='approved'` — does NOT currently tag the contact. This plan closes that gap so both approval paths behave the same in GHL.

Exempt projects (ECCO Medical, Premier Vascular, Premier Vascular Surgery, Davis Vein & Vascular) are also auto-approved by the webhook but are out of scope per the user's answer ("All approvals" = Setter Submitted + admin Approve). Exempt-project auto-approvals will NOT be tagged.

## Change

File: `supabase/functions/ghl-webhook-handler/index.ts`

In the new-appointment branch (around lines 270–287), after the existing Slack notification block, add a fire-and-forget call to the `update-ghl-contact-tags` edge function when:

- `isSetterSubmitted === true`, AND
- `appointmentRecord.ghl_id` is present

Behavior:

- Look up the project's `ghl_api_key` from `projects` (same pattern used by ReviewQueue).
- Invoke `update-ghl-contact-tags` with `{ ghl_contact_id, ghl_api_key, tags: ['approved'], action: 'add' }`.
- Wrap in try/catch and `.catch()` — must never block the webhook response or fail the insert.
- Log success / failure with the existing `[${requestId}]` prefix.

No other files change. No DB migration. No frontend changes.

## Memory update

Update `mem://index.md` Core rule for the Review Queue Gate to note: when Setter Submitted bypasses the queue, the contact is also tagged `approved` in GHL (matching the admin manual-approve behavior).
