## Issues identified

Gloria reported:
1. **An update made in GoHighLevel did not flow back to the portal.**
2. **The GHL link (orange external-link icon) is not visible from the portal.**

### Root causes

**Issue #1 — Inbound updates are silently dropped.**
The `ghl-webhook-handler` function supports two formats:
- **Workflow Webhook** — fired by GHL workflows when a new appointment is booked. This is what every CHVC/Ozark/AVA log entry today is.
- **Standard Event Webhook** (`AppointmentCreate`, `AppointmentUpdate`) — would carry status changes, reschedules, and contact edits made directly inside GHL.

Inspecting the last 24 h of `ghl-webhook-handler` logs shows zero `AppointmentUpdate` / Standard Event payloads — every CHVC inbound is the workflow trigger only. So when Gloria changes a status (or any field) inside GHL, nothing reaches the portal. Only outbound portal→GHL sync works today.

**Issue #2 — GHL link is admin-only.**
`AppointmentCard.tsx` line 1143 and `DetailedAppointmentView.tsx` line ~727 gate the GHL contact link behind `isAdmin()`. Gloria has the `va` role, so the icon is hidden for her even though `ghl_id` and `ghl_location_id` are present on the record.

## Proposed fix

### 1. Make the GHL link visible to Virtual Assistants
Update the visibility check in both card components from `isAdmin()` to `isAdmin() || isVA()` (or equivalent role check that matches the existing VA role helper). This matches the recently-added VA permissions for notes, viewing, and editing.

Files affected:
- `src/components/appointments/AppointmentCard.tsx` (~line 1143)
- `src/components/appointments/DetailedAppointmentView.tsx` (~line 727)

Verify the `useRole` hook exposes a VA check (or add a small `isVA()` helper there).

### 2. Enable two-way sync from GHL → Portal for appointment updates
Two complementary parts; both should be done.

**a) GHL configuration (one-time, done by user/admin in GHL):**
For every sub-account that needs two-way sync (start with CHVC + Ozark Regional), add a Workflow that fires on **Appointment Status Change** and **Appointment Updated** triggers, posting to the same `ghl-webhook-handler` URL. The handler already detects and routes Workflow payloads — but the workflow needs to pass enough context (appointmentId, status, startTime, endTime). We will document the exact field mapping the handler expects.

**b) Handler hardening (code change):**
Extend `ghl-webhook-handler` so a Workflow payload that targets an existing `ghl_appointment_id` performs a status/time update path (not a create-or-skip path). Today the function's "is this an update?" branch only triggers if a matching record is found AND the call is a Standard Event Webhook. We will:
- When a Workflow Webhook arrives and `ghl_appointment_id` already exists in `all_appointments`, treat it as an update (sync `status`, `requested_time`, `date_of_appointment`, `calendar_name`, contact edits) instead of returning early.
- Continue honoring the existing terminal-status protection (OON, Do Not Call, portal Cancelled cannot be overwritten by GHL) and the 120 s echo-back debounce.
- Log the update reason for traceability.

### 3. Communicate to the team
Once the workflow is in place, Slack/Loom note to clinic operators explaining: status changes inside GHL now reflect in the portal within ~2 minutes; portal-side terminal statuses (OON, Do Not Call, Cancelled set in portal) still take precedence over GHL.

## Out of scope / not changing

- The portal→GHL push (already works via `update-ghl-appointment`).
- Adding a polling/reconciliation job — webhooks are sufficient if the GHL workflow is configured.
- Christa Hagemeier's record specifically — her appointment is already correctly Cancelled in the portal; the fix prevents the next occurrence.

## Technical summary

| Change | File / Location | Type |
|---|---|---|
| Show GHL link to VAs | `AppointmentCard.tsx` ~L1143 | UI gate |
| Show GHL link to VAs | `DetailedAppointmentView.tsx` ~L727 | UI gate |
| Treat workflow payload with existing `ghl_appointment_id` as update | `supabase/functions/ghl-webhook-handler/index.ts` | Edge function |
| Add VA helper if missing | `src/hooks/useRole.tsx` | Hook |

No DB migration required.

Approve to proceed?