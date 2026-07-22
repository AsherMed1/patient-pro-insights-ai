## Two-Way Patient Name Sync (Portal ↔ GHL)

Make the patient name a single source of truth. Portal edits push to GHL; GHL edits continue to flow into the portal. Applies to updates going forward only — no historical backfill.

### Current state (verified)
- Inbound: `ghl-webhook-handler` writes `all_appointments.lead_name` from GHL contact/appointment payloads.
- Outbound: No portal → GHL name push today. Name is read-only in the UI.
- Name is displayed in `AppointmentCard.tsx`, `DetailedAppointmentView.tsx`, and the QA drawer.

### Safety guarantees

- **No historical writes.** Nothing runs against existing rows. No backfill migration, no bulk update, no trigger that touches rows already in the table. The only DB change is adding one nullable column.
- **Additive, reversible schema change.** `ADD COLUMN name_last_synced_at timestamptz` is nullable with no default — safe on a large table, no rewrite, no impact on existing queries or types.
- **Opt-in per edit.** The GHL push only fires when a user explicitly clicks Save on the new inline name editor. Nothing runs on page load, on webhook receipt, or in the background.
- **Permission-gated.** Only `admin`, `agent`, `qa_specialist`, and `va` roles see the edit affordance. Everyone else sees the name as plain text (unchanged from today).
- **Roll back on failure.** If the GHL PATCH returns a non-2xx, revert the local `lead_name` (and mirrored `parsed_contact_info.name`) to the previous value and show an error toast. The DB row is only kept-changed after GHL confirms.
- **Missing `ghl_id` is handled.** If the appointment has no linked GHL contact, allow the local edit but skip the GHL push and show a clear toast. No API call attempted, no error.
- **Echo-back guard preserves existing sync behavior.** The 120s window mirrors the pattern already used for status (Sync Protection core rule). If the guard misfires, the worst case is one skipped inbound name update — the next GHL webhook after the window closes resumes normal behavior.
- **Same-patient consistency, scoped and bounded.** When a name is saved, update sibling rows sharing the same `ghl_id` (same patient, multiple appointments) in one UPDATE. Bounded by `ghl_id`, cannot fan out to unrelated rows. If `ghl_id` is null, only the single row is updated.
- **Audit trail on every edit.** Each save writes an `appointment_notes` row: `Name changed from "X" to "Y" by {userName}` (matches existing attribution pattern), so the change is traceable and reversible by hand if needed.
- **No impact on inbound flow for un-edited patients.** Patients that never get renamed in the portal continue to sync from GHL exactly as they do today — the echo-back guard only applies when `name_last_synced_at` is set, which only happens after an explicit portal edit.

### What will change

**1. Portal → GHL (outbound, new)**
- Inline "Edit name" pencil in `DetailedAppointmentView.tsx` header. Save/Cancel; permission-gated.
- On save:
  - PATCH GHL contact via new edge function `update-ghl-contact-name` (`firstName` + `lastName` split, single-token names → firstName only, suffixes like Jr./Sr./III kept on `lastName`).
  - On success: update `all_appointments.lead_name` and mirror into `parsed_contact_info.name`. Set `name_last_synced_at = now()`. Update sibling rows sharing the same `ghl_id`.
  - Log `appointment_notes` audit entry.
  - On failure: revert UI, no DB change, error toast.

**2. GHL → Portal (inbound, existing behavior + guard)**
- In `ghl-webhook-handler`, when a name arrives from GHL:
  - If `name_last_synced_at` is within the last 120s and the payload's name equals the current `lead_name`, skip (echo-back).
  - Otherwise apply as today.

**3. Scope**
- No historical backfill. Existing rows keep their current `lead_name` untouched. `name_last_synced_at` stays null on every existing row and only gets populated when a user saves a name edit from the portal going forward.

### Files touched

- `src/components/appointments/DetailedAppointmentView.tsx` — inline editable name in the sticky header.
- `supabase/functions/update-ghl-contact-name/index.ts` — new function, PATCH `/contacts/{id}` with `firstName`/`lastName` using project's `ghl_api_key`.
- `supabase/functions/ghl-webhook-handler/index.ts` — add 120s echo-back guard for name.

### Database

Single additive migration:
```sql
ALTER TABLE public.all_appointments
  ADD COLUMN name_last_synced_at timestamptz;
```
No RLS/grant changes — column inherits table policies. No data written.

### Permissions
Edit affordance visible only to `admin`, `agent`, `qa_specialist`, `va`. All other roles unchanged.

### Out of scope
- Bulk normalization of historical names.
- Editing name from the Review Queue (edits happen from the detail view).
- Retroactive attribution for past name changes.

### Memory update
Add `mem://integrations/ghl-name-two-way-sync`: "Portal name edits PATCH GHL via `update-ghl-contact-name`; inbound GHL webhooks apply a 120s echo-back guard using `name_last_synced_at`. Sibling rows sharing the same `ghl_id` update together. Applies to edits going forward — no historical backfill." Existing `mem://integrations/ghl-name-mapping-priority` stays (covers initial inbound mapping).
