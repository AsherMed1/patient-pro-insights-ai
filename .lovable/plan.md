
## ECCO Medical: restore, dedupe, and inline date/time

Four pieces of work driven by the support ticket.

### 1. Restore Rebecca Patton

The deleted row (`cd7087fb-…`) is fully preserved in `hipaa_audit_log` (`appointment_update` snapshot, 2026-05-18). Reinsert a single appointment row from that snapshot. Key fields:

- Lead: Rebecca Patton — +1 720-730-1133 — rebeccapatton2017@gmail.com
- DOB 1967-02-15 · Humana Gold / Medicare Advantage · Plan 2B170 · Group H67817186
- Project ECCO Medical · GHL contact `POaJ8KKfwU11nVpN4o5K` · location Lone Tree
- Service GAE, time preference Afternoon, `is_unscheduled=true`, `review_status='approved'`
- Restore full `parsed_*` JSONB and `patient_intake_notes` exactly as captured.

Done via a one-time `INSERT` (using the insert tool, not a migration). Uses a new UUID; logs an audit entry noting "Restored from HIPAA audit snapshot after accidental cascade delete."

### 2. Stop duplicate creation for ECCO/Premier unscheduled leads

Today the ingestion path inserts a fresh `all_appointments` row every time GHL fires for the same unscheduled lead (Sulema Parra: 2 rows 1s apart; Janice Oconnell, Mary Oprisa, Candace Kness all duplicated).

Add a guard in `supabase/functions/ghl-webhook-handler/index.ts` (and any other ingestion paths that create unscheduled rows for the three exempt projects):

- Before inserting an unscheduled lead row, look up an existing row in the same project where `ghl_id` matches the incoming contact ID.
- If found, **update** that row instead of inserting. Preserve current `status` if it's terminal (per existing sync-protection rule).
- If not found, insert as today.

This is the "same GHL contact ID" rule the user picked — safest and won't merge unrelated re-inquiries.

### 3. Backfill: collapse existing duplicates

One-time cleanup for ECCO Medical, Premier Vascular, and Premier Vascular Surgery:

- Group by `(project_name, ghl_id)` where `ghl_id IS NOT NULL` and `is_unscheduled=true`.
- For each group with >1 row, keep the **most recent non-terminal** row (or the most recent row if all terminal), delete the rest.
- Groups with no `ghl_id` are left alone (no safe dedupe key).

Run via the insert/delete tool with a `RETURNING` log of removed IDs.

### 4. Inline date/time on the appointment card for unscheduled leads

Currently `AppointmentCard` shows only `time_preference` (morning/afternoon/evening) for ECCO/Premier unscheduled rows. The Reschedule modal is the only path to set a real date/time.

Change in `src/components/appointments/AppointmentCard.tsx` (and any presentation helper that hides date/time when `is_unscheduled`):

- Always render the existing inline Date picker and Time editor, even when `is_unscheduled=true`.
- When the user saves a date **and** time on an unscheduled lead, also flip `is_unscheduled` to `false` so the row behaves like a scheduled appointment from then on (badges, future-tab routing, short-notice alerts).
- Keep `time_preference` visible alongside as read-only context until a real date/time is set, then hide it.
- Reuse the same 2-phase Confirm/Cancel popover already used for GHL booking edits — no new component.

No webhook/sync changes needed: the existing update path already pushes date changes to GHL when `ghl_appointment_id` exists; for unscheduled leads with no GHL appointment yet, the row simply becomes a normal scheduled row in our system (no GHL appointment is created — matches today's "Reschedule" behavior for unscheduled leads).

### Out of scope

- The "Confirmed in Needs Review" complaint: data and filter logic both show unscheduled Confirmed rows go only to New (not Needs Review). The example given (Rebecca Patton) is the deleted record, so this is likely the same duplicate-confusion issue rather than a routing bug. If after the dedupe + restore the client still sees Confirmed patients in Needs Review, capture a screenshot + name and reopen.

### Files / surfaces touched

- `supabase/functions/ghl-webhook-handler/index.ts` — dedupe-on-ingest guard for the 3 exempt projects.
- One-time data ops: restore Rebecca Patton; collapse existing duplicates.
- `src/components/appointments/AppointmentCard.tsx` (+ small helper in `src/components/appointments/utils.ts` if needed) — show inline Date + Time editors for unscheduled leads and flip `is_unscheduled` on first real date/time save.

### Memory updates after build

- Update `mem://projects/ecco-medical/unscheduled-capture` and `mem://projects/premier-vascular/unscheduled-capture` to record: ingestion is idempotent on `ghl_id`; inline date/time editing on the card transitions the lead to scheduled (`is_unscheduled=false`).
