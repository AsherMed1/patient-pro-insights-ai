# Fix Premier Vascular cross-project record collision

## Problem
GHL workflow webhooks for Premier Vascular send literal string `"null"` for `appointmentId`. The `findExistingAppointment` matcher treated `"null"` as a valid ID and matched against the first row in the database with `ghl_appointment_id = "null"` — a Richmond Vascular Center patient (Ashley Caldwell). Every Premier unscheduled lead overwrote that same row.

## Fix

### 1. `supabase/functions/ghl-webhook-handler/index.ts` — `findExistingAppointment`
- Add a `sanitizeId(v)` helper that returns `null` for `null`, `undefined`, empty string, whitespace-only, or the literal strings `"null"` / `"undefined"` (case-insensitive).
- Apply it to `ghl_appointment_id` and `ghl_id` before any DB lookup.
- Scope every `ghl_id` and `ghl_appointment_id` lookup with `.eq('project_name', projectName)` so a contact ID from one sub-account can never match a row in another project.
- Same scoping for the phone/email/name fallbacks (already partially done — verify).

### 2. Webhook payload extraction
- Apply the same `"null"`-string sanitization when extracting `ghl_appointment_id`, `calendar_name`, `date_of_appointment`, `requested_time` from the payload, so they land as real `NULL` in the DB instead of the string `"null"`.

### 3. Unscheduled insert path (Premier Vascular)
- When no project-scoped match is found AND project is in `UNSCHEDULED_CAPTURE_PROJECTS` (currently Premier Vascular):
  - Insert with `is_unscheduled = true`, `date_of_appointment = null`, `requested_time = null`, `status = 'Confirmed'`, `internal_process_complete = false`.
  - Parse `customFields.time_preference` (morning/afternoon/evening/no_preference); default `no_preference`.

### 4. Data cleanup (one-shot insert/update via insert tool)
- Restore Ashley Caldwell row `f160ed1a-2208-4009-b87a-d7271ec707d3`:
  - Inspect current state vs. pre-collision values, revert overwritten fields (project_name back to Richmond Vascular Center if affected, clear Premier-test address/phone/dob/intake notes).
  - Set `ghl_appointment_id = NULL` (it currently holds the literal string `"null"` — the source of the bug).
- After deploy, manually create the Premier test row for `j4WFc81DrwZCrEUU2feL` so the user can verify in the UI without re-firing GHL.

### 5. Verification
- Re-fire the GHL Premier workflow and confirm:
  - A new row is inserted (not Ashley's record).
  - `is_unscheduled = true`, dates null, time_preference populated.
  - Routes to Needs Review tab on `/project/Premier Vascular`.

## Out of scope
- No changes to other projects' webhook flow.
- No schema changes (columns already exist from the prior migration).
