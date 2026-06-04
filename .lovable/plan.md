## Root cause

The bypass logic in `ghl-webhook-handler/index.ts` (lines 210–213, 543, 609, 667–685) is wired correctly. The problem is upstream in GHL: the **Workflow webhook is not sending the "Insurance Intake Source" custom field** at all.

Inspecting the most recent payloads in edge function logs, every `customFields` object looks like this:

```json
"customFields": {
  "insurance_provider": "...",
  "insurance_member_id": "...",
  "insurance_id_link": "...",
  "primary_complaint": "...",
  "symptoms": "...",
  "address": "...",
  "city": "...",
  "state": "...",
  "zip": "..."
}
```

There is no `insurance_intake_source` (or any variant) key. Result: `extractInsuranceIntakeSource()` returns `null` → handler logs `intake_source=unspecified` → review_status defaults to `pending` (correct fallback behavior per the memory: "unset goes through review").

So nothing in the app is broken — the GHL workflow simply isn't populating the new field into the outbound webhook body.

## Fix (two parts)

### 1. GHL configuration change (you, not code)

In every GHL sub-account's workflow that fires the appointment webhook to Lovable, add the **Insurance Intake Source** custom field to the webhook's Custom Data payload. The field must be sent under a key whose name matches `/insurance[\s_-]*intake[\s_-]*source/i` — the simplest is literally `insurance_intake_source`. Value must contain the word "setter" or "patient" (case-insensitive). Examples that work today: `Setter Submitted`, `setter_submitted`, `Patient Submitted`.

Until this is added to the workflow, every appointment will continue to hit the review queue regardless of what's stored on the GHL contact.

### 2. Code change — fallback fetch from GHL contact

To make this resilient even if a workflow forgets to map the field, update `supabase/functions/ghl-webhook-handler/index.ts` so that when `insurance_intake_source` is `null` after extraction AND we have a `ghl_id` (contact id) + `ghl_location_id`, we fetch the contact from GHL's API (`GET /contacts/{contactId}`, same auth pattern already used elsewhere in the codebase) and re-run `extractInsuranceIntakeSource()` against `contact.customFields`. This is gated to only run when the value is missing, so it adds at most one extra GHL call per pending appointment.

Also add a clearer warning log when the field is missing entirely so future "didn't bypass" reports are immediately diagnosable:

```
[WARN] Insurance Intake Source not present in webhook payload nor on GHL contact — routing to review queue.
```

### Files touched

- `supabase/functions/ghl-webhook-handler/index.ts` — add fallback contact lookup right before the `isSetterSubmitted` check (~line 209), plus the warning log.

### Verification

1. Submit an insurance form in GHL with the custom field set to "Setter Submitted" **before** the workflow update → still routes to review (confirms current state).
2. Add `insurance_intake_source` to the GHL workflow webhook Custom Data → next submission with "Setter Submitted" bypasses review and appears directly in the client portal. Edge function logs show `bypass=setter_submitted`.
3. Submission with "Patient Submitted" → still routes to review queue.
4. Submission with the workflow field missing but contact field set → fallback fetch picks it up; logs show `intake_source=setter_submitted (from contact fallback)`.
