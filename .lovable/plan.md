## Root cause

Reproducing the failing "Create ticket" call returned:

```
ControlHub request failed (500):
"Could not find the 'source' column of 'va_request_submissions' in the schema cache"
```

The ControlHub team applied the VA routing branch we sent them, but they're passing PatientPro's `source: "patientpro_qa_queue"` straight into the `va_request_submissions` insert. That table has no `source` column (only `tech_ticket_submissions` does), so PostgREST rejects the insert and the failure bubbles back through our edge function as a non-2xx.

Nothing in PatientPro needs to change — our payload is correct and matches the shape they asked for.

## Deliverable

Provide a second, drop-in prompt the user can paste into the PPM ControlHub project telling that agent to only pass columns that exist on `va_request_submissions` (drop `source` and any other tech-only fields from the VA branch), and to whitelist columns per branch so this class of error can't recur.

Content of the prompt (to be pasted into ControlHub):

```text
You are working in the PPM ControlHub project (project id: 3d134fcb-0269-41ba-a69a-68661f5fab98).

Bug: `supabase/functions/receive-external-ticket/index.ts` now branches on `issue_type`, but the VA branch is still passing the full inbound payload (including `source`) into `va_request_submissions`. That table has no `source` column, so the insert fails with:
"Could not find the 'source' column of 'va_request_submissions' in the schema cache"

Fix:
1. In the VA branch, build the insert row EXPLICITLY — only include columns that exist on `va_request_submissions`:
   - task_name
   - submitted_by
   - client_name
   - account_location  ← from body.service_involved
   - issue_category    ← "External — PatientPro QA"
   - priority
   - description       ← if `additional_info` column does not exist on va_request_submissions, append `\n\nMetadata: ${JSON.stringify(body.metadata ?? {})}` to the description here
   - status            ← "open"
   Do NOT spread the request body. Do NOT pass `source`, `external_case_id`, `issue_type`, `submitted_by_email`, or `metadata` as columns.

2. In the tech branch, do the same — build the insert row explicitly from the known columns of `tech_ticket_submissions` instead of spreading `body`. This prevents the same failure mode if PatientPro adds new payload fields later.

3. Keep the profile linkage (`submitted_by_email` → `user_id`) as an UPDATE on whichever table was inserted into.

4. Keep the Slack notification for the VA branch (`ticket_type: "va"`) firing after a successful insert.

5. Deep link stays: `${publicOrigin}/admin?ticket=${data.id}&type=${isVA ? "va" : "tech"}`.

After deploying, retest by clicking "Create ticket" as a VA Ticket from the PatientPro QA Operations Queue and confirm a row appears in `va_request_submissions` and the ticket lands under VA Requests in ControlHub.
```

## No changes on this side

- `create-controlhub-ticket` is already correctly forwarding `issue_type: "va"` and rewriting the stored `ticket_url` to `&type=va`.
- Once ControlHub ships the column-whitelist fix, the same "Create ticket" click will succeed with no further PatientPro changes.