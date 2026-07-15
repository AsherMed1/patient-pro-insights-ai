# Connect QA Operations Queue → PPM ControlHub

Two separate Lovable projects = two separate Supabase instances. The cleanest and safest way to connect them is a small HTTP bridge: PatientPro calls a public edge function on ControlHub, authenticated with a shared API key, and ControlHub inserts the ticket into its own database using service role. This is exactly what the existing `create-controlhub-ticket` function was already designed for — we just need to build the ControlHub side and wire the two secrets.

## Architecture

```text
PatientPro Portal                                 PPM ControlHub
─────────────────                                 ──────────────
QAOperationsQueue.tsx
  │
  ▼
create-controlhub-ticket  ──HTTPS + Bearer token──▶  receive-external-ticket
  (already exists)                                    (new edge function)
                                                        │
                                                        ▼
                                                     tech_ticket_submissions
                                                     (or the correct ticket table)
```

Why this beats the alternatives:
- **Direct DB write from PatientPro into ControlHub's Supabase** → would require sharing ControlHub's service role key, bypasses ControlHub RLS, and couples the two schemas. Rejected.
- **MCP** → great for the Lovable chat agent, but MCP tools aren't callable from a deployed React app. Not the right layer.
- **Manual copy-paste** → not automation.

## What we'll build

### 1. On ControlHub (PPM ControlHub project)
Create a new edge function `receive-external-ticket`:
- `verify_jwt = false` (called from another project, not a signed-in user).
- Requires header `x-api-key` matching a new secret `PATIENTPRO_INBOUND_API_KEY`.
- Accepts JSON: `{ source, external_case_id, title, description, patient_name, project_name, service_line, alert_type, appointment_status, metadata }`.
- Uses service role to insert a row into the correct ticket table (need to confirm which one — likely `tech_ticket_submissions` given the codebase, but I'll verify the table + required columns during build).
- Returns `{ ticket_id, ticket_url, status }` so PatientPro can store them on the QA case.

### 2. On PatientPro (this project)
Small updates to `create-controlhub-ticket/index.ts`:
- Send `x-api-key` header instead of `Authorization: Bearer`.
- POST to `${CONTROLHUB_BASE_URL}/functions/v1/receive-external-ticket`.
- Everything else — case lookup, `qa_cases` update, activity log — stays as-is.

No frontend changes. The "Create ControlHub Ticket" button in `QAOperationsQueue.tsx` already calls this function.

### 3. Secrets
On **PatientPro**:
- `CONTROLHUB_BASE_URL` → `https://<controlhub-supabase-ref>.supabase.co`
- `CONTROLHUB_API_KEY` → the shared key

On **ControlHub**:
- `PATIENTPRO_INBOUND_API_KEY` → same shared key

I'll generate one strong random value and give you the same value to store on both sides.

### 4. Testing
1. Create a test QA case in the PatientPro queue.
2. Click "Create ControlHub Ticket".
3. Verify: ticket appears in ControlHub's ticket list, `qa_cases.controlhub_ticket_id` and `controlhub_ticket_url` populated on the PatientPro side, `qa_case_activity` shows `ticket_created` (stub=false).

## Out of scope (unless you want it)

- **Two-way sync** (ControlHub → PatientPro when a ticket is resolved). Doable later via a ControlHub webhook hitting a new PatientPro edge function.
- **Backfilling existing stub tickets** into real ControlHub tickets.
- **Deep-linking a specific ControlHub ticket type** (tech / feature / bug). I'll default to whatever ControlHub uses for QA/ops issues; tell me if you want it to route to a specific type.

## Files touched

- ControlHub project (I can only read it from here — you or I in that project will need to create it): `supabase/functions/receive-external-ticket/index.ts`.
- PatientPro: `supabase/functions/create-controlhub-ticket/index.ts` (small header + URL change).
- Secrets on both projects.

## Question before I build

Do you want me to:
- **(A)** Build the PatientPro side now and give you a ready-to-paste `receive-external-ticket` function you drop into the ControlHub project, or
- **(B)** Have you switch me over to the ControlHub project so I build it there directly, then come back here and finish the wiring?

Option B is cleaner (I can verify the exact ticket table and columns instead of guessing).
