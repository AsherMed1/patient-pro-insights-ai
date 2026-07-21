## Purpose

Provide a self-contained prompt the user can paste into the PPM ControlHub project to fix the bug where all PatientPro external tickets are routed to `tech_ticket_submissions` even when `issue_type: "va"` is sent.

## Paste this into the PPM ControlHub project

```text
You are working in the PPM ControlHub project (project id: 3d134fcb-0269-41ba-a69a-68661f5fab98).

Problem: The `receive-external-ticket` Supabase Edge Function at `supabase/functions/receive-external-ticket/index.ts` currently routes ALL external tickets from PatientPro into the `tech_ticket_submissions` table, regardless of the `issue_type` field. When PatientPro sends `issue_type: "va"`, it should be inserted into `va_request_submissions` instead, and the returned deep link should use `type=va`.

Please make the following changes to `supabase/functions/receive-external-ticket/index.ts`:

1. Read `body.issue_type` (case-insensitive). If it equals `"va"` (any case), treat the ticket as a VA request. Otherwise, treat it as a tech ticket.

2. For VA tickets:
   - Insert into `va_request_submissions` table with these columns:
     - `task_name` ← `body.task_name`
     - `submitted_by` ← `body.submitted_by`
     - `client_name` ← `body.client_name`
     - `account_location` ← `body.service_involved`
     - `issue_category` ← `"External — PatientPro QA"`
     - `priority` ← `body.priority`
     - `description` ← `body.description`
     - `additional_info` ← `JSON.stringify(body.metadata ?? {})` (if the column does not exist, append the metadata JSON to the end of `description` instead)
     - `status` ← `"open"`
     - `sla_deadline` ← `null`
   - Apply the same `submitted_by_email` → `user_id` profile linkage that currently exists for tech tickets, but update the row in `va_request_submissions`.
   - Fire the same Slack notification that the in-app VA form uses, with `ticket_type: "va"`, so VA supervisors are notified.
   - Return `ticket_url` with `type=va`: `${publicOrigin}/admin?ticket=${data.id}&type=va`

3. For tech tickets (and any other issue_type):
   - Keep the existing insert into `tech_ticket_submissions` unchanged.
   - Return `ticket_url` with `type=tech`: `${publicOrigin}/admin?ticket=${data.id}&type=tech`

4. Update the Zod schema so `issue_type` is still a free-form string, but `"va"` is matched case-insensitively.

No database migration is needed if `va_request_submissions` already permits the listed columns with nullable defaults. If `additional_info` does not exist on `va_request_submissions`, do not add it; instead append the metadata JSON to the end of `description`.

After the change, deploy the edge function and verify by sending a test payload with `issue_type: "va"` from PatientPro and confirming the ticket appears under VA Requests in ControlHub with the correct deep link.
```

## Notes

- The PatientPro side has already been hardened: `create-controlhub-ticket` now forces the `type=` parameter in the stored `ticket_url` from its own `issue_type`, so once ControlHub returns the correct `type=va` URL the deep link will be consistent.
- No further code changes are required in PatientPro after ControlHub ships this fix.