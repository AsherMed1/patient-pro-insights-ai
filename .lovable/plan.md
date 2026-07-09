## Problem

The recently deployed "Sync Contact Notes → Portal" workflow appears to have created 7 duplicate appointments (Anthony Dickson, Isaiah Ballard, Kevin Jahner, Charles Anderson, Jacque Cooper, Randy Gautreaux, Lola Taylor) instead of just updating notes on existing ones. When the contact has no matching appointment in the portal for that project, we should skip — never create a new row.

## Fix (single file: `supabase/functions/ghl-webhook-handler/index.ts`)

### 1. Make `tryContactNotesSync` fully authoritative for notes payloads
- If `payload.sync_type === 'contact_notes_only'`, ALWAYS return a terminal response (safe skip) — never let the request fall through into `extractWebhookData` / appointment upsert, regardless of other fields present in the payload.
- Broaden auto-detection: if the payload has a `contact_id`/`contactId` and a Notes custom field but no `ghl_appointment_id`/`calendar.appointmentId`, treat as notes-only and terminate after attempting the notes update.
- When no matching non-terminal, non-superseded appointment exists for `ghl_id = contact_id`, log and return `{ updated: 0, reason: 'no_matching_appointments' }` (already implemented) — but also add an audit log entry so we have visibility next time.

### 2. Add a global CREATE-path guard
Before the INSERT branch in the main handler, add a defensive check:
- If the original payload carried `sync_type === 'contact_notes_only'` OR (has `contact_id` + Notes custom field + no `ghl_appointment_id` + no `calendar` object), refuse to create a new appointment and return a `skipped` response with reason `notes_sync_no_matching_appointment`.

This is belt-and-suspenders: even if any future refactor removes the early intercept, the CREATE path itself will reject notes-only traffic.

### 3. Match scope for updates
Keep the existing behavior: notes-only sync only updates `parsed_medical_info.notes` on active (non-superseded, non-terminal) appointments matched by `ghl_id`. No inserts, no `patient_intake_notes` writes, no status/date changes.

## Out of scope
- No schema changes.
- No changes to the GHL workflow itself (documented separately in prior turn — copying the workflow to other subaccounts still works).
- The 7 duplicate rows were already deleted in the previous turn.
