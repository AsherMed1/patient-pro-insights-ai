# Finishing the ControlHub bridge

## Important limitation

I can **read** from the PPM ControlHub project, but I cannot write files or run migrations into it from here — cross-project tooling is one-way (other → current). The ControlHub-side pieces have to be created inside the ControlHub project itself.

## What needs to happen on ControlHub (you drive this)

1. Open the **PPM ControlHub** Lovable project.
2. In that project's chat, paste this single instruction:

   > Create an edge function `receive-external-ticket` that accepts POST with an `x-api-key` header matching the `PATIENTPRO_INBOUND_API_KEY` secret, and inserts a row into `tech_ticket_submissions` using the JSON body fields `task_name`, `submitted_by`, `client_name`, `service_involved`, `issue_type`, `description`, `priority`, and `metadata` (stringified into `additional_info`). Return `{ ticket_id, ticket_url, status }`. Set `verify_jwt = false` for this function. Then add a secret named `PATIENTPRO_INBOUND_API_KEY` — I'll paste the value.

3. When ControlHub's agent asks for the secret value, paste the **same** value you saved here as `CONTROLHUB_API_KEY`.

## What I'll do on this side (once you confirm ControlHub is live)

- Verify the PatientPro `create-controlhub-ticket` function successfully POSTs to `https://afduvfbmompcttptcjli.supabase.co/functions/v1/receive-external-ticket` using a real QA case.
- Confirm the returned `ticket_id` and `ticket_url` are saved on `qa_cases` and that `qa_case_activity` records `stub: false`.
- If the call fails (401, CORS, schema mismatch), read the ControlHub function's code via cross-project tools and tell you exactly what to adjust on that side.

## Why I can't just do it

Cross-project tools list/read files and copy assets **into** the current project. There is no write-to-other-project tool. Attempting to shortcut this (e.g. calling ControlHub's Supabase directly with a service-role key from here) would require pasting ControlHub's service-role key into this project — which violates the "never expose service_role" rule and couples the two projects in a way that will break the next time either project rotates keys.

## Alternative if you'd rather not switch projects

Say the word and I'll instead **remove the HTTP bridge** and keep ControlHub ticket creation in permanent stub mode (records intent in `qa_case_activity`, no external call). QA specialists still get a tracked ticket ID on the case; they just create the matching ControlHub ticket manually. This is a clean fallback if the ControlHub side is going to take a while.