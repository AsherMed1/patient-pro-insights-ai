## Root cause

VA tickets from PatientPro land in ControlHub's **Tech Ticket** bucket because ControlHub's inbound webhook ignores `issue_type` and unconditionally writes every external ticket to `tech_ticket_submissions`, then returns a `type=tech` deep link.

Confirmed in ControlHub project (`PPM ControlHub`, id `3d134fcb-...`), `supabase/functions/receive-external-ticket/index.ts`:
- Always `insert` into `tech_ticket_submissions` regardless of `body.issue_type`.
- Always returns `ticket_url: .../admin?ticket=<id>&type=tech`.
- VA requests actually live in a different table with a different shape: `va_request_submissions` (columns include `issue_category`, `account_location`, `action_taken`, `escalation_reason`, `loom_video`, `sla_deadline` — no `issue_type` column).

PatientPro's side (`create-controlhub-ticket`) is already sending `issue_type: "va" | "tech"` correctly and rewriting the returned URL to `/admin?ticket=...&type=<type>`. So the front end shows the right label ("VA Ticket — …") but the record is a tech row, and the "BVA - Mary Franko" case that shows as "VA Request" is one someone submitted through ControlHub's own VA form, not through PatientPro.

**This fix must be made in the ControlHub project, not PatientPro.** I cannot edit that project from here. Below is exactly what needs to change there, plus a small hardening on our side.

## Changes in the ControlHub project (PPM ControlHub)

Edit `supabase/functions/receive-external-ticket/index.ts`:

1. Branch on `body.issue_type`:
   - `"va"` → insert into `va_request_submissions` with the mapped columns below.
   - anything else (`"tech"`, `"other"`, unset) → keep current `tech_ticket_submissions` insert.
2. Map PatientPro payload → `va_request_submissions` row:
   - `task_name` ← `task_name`
   - `submitted_by` ← `submitted_by`
   - `client_name` ← `client_name`
   - `account_location` ← `service_involved` (closest analogue; VA form calls this "account/location")
   - `issue_category` ← `"External — PatientPro QA"` (constant; PatientPro's own error category lives inside `description` / `additional_info`)
   - `priority` ← `priority`
   - `description` ← `description`
   - `additional_info` ← `JSON.stringify(metadata ?? {})` (add column if missing; otherwise fold into `description`)
   - `status` ← `"open"`
   - `sla_deadline` ← null (let ControlHub apply its default)
3. Same `submitted_by_email` → `user_id` linkage, but update `va_request_submissions` when the branch is VA.
4. Return `ticket_url` with the correct type:
   - VA branch → `${publicOrigin}/admin?ticket=${data.id}&type=va`
   - Tech branch → unchanged `&type=tech`
5. Fire the same Slack notification the in-app VA form fires (`ticket_type: "va"`) so VA supervisors get pinged, matching parity with tech.

Zod schema change: keep `issue_type` free-form but treat `"va"` case-insensitively; everything else falls through to tech.

No DB migration needed if `va_request_submissions` already permits the columns above with nullable defaults (VA form inserts leave many of them null already). If `additional_info` doesn't exist on that table, drop it and append the metadata JSON to the end of `description` instead.

## Changes in this project (PatientPro)

Small hardening only — nothing user-visible changes until ControlHub ships the fix above:

1. `supabase/functions/create-controlhub-ticket/index.ts`: when `normalizedIssueType === "va"`, if ControlHub's response `ticket_url` still comes back as `type=tech` (legacy behavior), overwrite it to `type=va` before we persist it on `qa_cases`. We already rewrite the URL — extend that rewrite to always trust our `normalizedIssueType` over whatever ControlHub returned. This means once ControlHub is fixed, existing VA rows that were misfiled as tech still deep-link to the VA view once someone moves them (and future VA tickets deep-link correctly immediately).
2. No UI changes.

## Cleanup of existing misfiled tickets

Two options (ControlHub-side, not automated by this plan):
- Manual: reopen each VA-labeled tech ticket in ControlHub and recreate as a VA request, then delete the tech row.
- Scripted (optional follow-up): a one-off ControlHub SQL migration that moves rows from `tech_ticket_submissions` where `task_name LIKE 'VA Ticket —%'` into `va_request_submissions` with the column mapping above.

I'd recommend the scripted cleanup as a follow-up once the webhook fix is live so the two ticket streams stop mixing.

## What you'll see after the ControlHub fix ships

- New VA tickets submitted from PatientPro appear under **VA Requests** in ControlHub with the "VA Request · <submitter> · <date>" subtitle, not "Tech Ticket · …".
- The deep link opened from PatientPro's QA queue lands on the VA ticket view.
- Tech tickets continue to work exactly as they do today.

## Technical notes

- Files to change in **PPM ControlHub** (project id `3d134fcb-0269-41ba-a69a-68661f5fab98`):
  - `supabase/functions/receive-external-ticket/index.ts` (branching + VA insert + Slack + return URL).
- File to change in **this project**:
  - `supabase/functions/create-controlhub-ticket/index.ts` (force `type=` in stored `ticket_url` from our `normalizedIssueType`).

Do you want me to (a) proceed with the PatientPro-side hardening now, and (b) hand you a ready-to-paste patch to apply in the PPM ControlHub project? I don't have write access to that project from here.