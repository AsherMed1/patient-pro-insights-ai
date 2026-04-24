## Bulk Remediation Plan — Auto-Cancelled Appointments from Time-Block Incident

### Goal

For every appointment that was silently cancelled in GHL by a clinic time block (and pushed into reschedule comms), do three things in one operator-controlled batch run:

1. **Restore** the appointment in GHL to `confirmed` status (and re-attach to the original calendar/slot if GHL deleted the event).
2. **Suppress reschedule comms** so the patient doesn't get a second wave of conflicting messages.
3. **Mirror status back into the portal** as `Confirmed` and add an internal note explaining what happened, so clinic staff know to call/verify the patient.

A separate audit pass identifies the population system-wide (not just VIM) and produces a CSV before any writes happen, so we run a scoped dry-run first and only execute after a human signs off.

---

### Identifying the impacted population (system-wide)

Three independent signatures indicate an appointment was a victim of the bug. We union them so we don't miss cases that don't fit just one:

| Signature | Source of truth | Catches |
|---|---|---|
| **A. Suppressed-webhook signature** | `security_audit_log` rows where `event_type='appointment_auto_completed'` and `details.old_status === details.new_status` (the existing audit fn already detects this) | Welcome Call rows on Apr 21+ |
| **B. Time-block overlap signature** | Any appointment with `was_ever_confirmed=true` whose `(date_of_appointment, requested_time)` overlaps a `is_reserved_block=true` row in the same `project_name`+`calendar_name` created Apr 13–23 | Confirmed/Pending rows that the old `blockConflictScan` swept up |
| **C. GHL ground truth** | For every candidate from A or B, fetch `appointmentStatus` from `services.leadconnectorhq.com/calendars/events/appointments/{id}` — if GHL says `cancelled` but portal still says active-tier, it's a confirmed victim | The actual remediation list |

The audit function from the previous turn already does A + C. We extend it to also do B, and we add the option to scope by `since` / `project_name` / `created_within_block_window` for a system-wide sweep.

Output: a single `audit_report.json` + `audit_report.csv` written to storage, with one row per suspect appointment, columns: `project_name, lead_name, lead_phone, date_of_appointment, requested_time, calendar_name, ghl_appointment_id, ghl_contact_id, portal_status, ghl_status, signature (A|B|both), suppressed_webhook_hits, block_overlap_id`.

This CSV is what the team reviews before approving the bulk write.

---

### Restoring in GHL

There are two cases per appointment, determined by the GHL fetch:

- **Case 1 — GHL event still exists, status `cancelled`**: PATCH `services.leadconnectorhq.com/calendars/events/appointments/{ghl_appointment_id}` with `{ appointmentStatus: 'confirmed' }`. Keep the original `startTime`, `endTime`, `calendarId`, `assignedUserId` — do NOT pass new times so we don't accidentally reschedule.
- **Case 2 — GHL event was deleted (404)**: Recreate using `create-ghl-appointment` with the original `calendar_id`, `assignedUserId`, `startTime`, `endTime`, `contactId`, `title` from the portal row. New `ghl_appointment_id` is written back to `all_appointments.ghl_appointment_id`.

Both paths use the per-project `ghl_api_key` already stored on `projects` (same lookup the audit fn uses).

If the original slot is no longer free in GHL (e.g., another patient was booked into it after cancellation), the row is **not auto-restored** — it's flagged in the report as `slot_taken` for manual handling. We do NOT bump anyone else's appointment.

---

### Suppressing reschedule workflows

GHL's reschedule comms are workflow-triggered off the contact, not the appointment, so simply re-confirming the appointment doesn't stop the next scheduled SMS/email. Two-layer suppression:

1. **Tag the contact** with `lovable_block_incident_restored` via `PUT /contacts/{contactId}` (tags array). Clinic ops adds a workflow filter (`Contact does NOT have tag X`) to the existing reschedule workflow — one-time setup. From that point on, any in-flight reschedule sequence skips these patients.
2. **Temporarily enable DND** on the contact for the duration of the cleanup window (default: 24h) using the existing `update-ghl-contact-dnd` edge function with `enable_dnd=true`, then a scheduled re-enable to `false` after the window. This is a hard stop on outbound while staff manually call each patient. (The DND toggle is reversible and per-channel — we leave Call enabled so the clinic can still phone them, only SMS/Email are suppressed.)

Both actions are idempotent. The tag stays forever as a permanent marker; DND is auto-released.

For projects where the user prefers NOT to touch DND, the `dnd_suppress` flag in the request body can be set to `false` and only the tag is applied.

---

### Mirroring back into the portal

For each successfully restored appointment:

- `status` → `Confirmed`
- `cancellation_reason` → cleared
- `was_ever_confirmed` stays `true`
- Insert an `appointment_notes` row: *"[Block-incident restoration {date}] This appointment was auto-cancelled by GHL when a clinic time block was created over the slot, and a reschedule workflow was triggered. Both have been reversed. Patient may have received reschedule SMS/email — please call to reconfirm the original appointment time."*
- Insert a `security_audit_log` row with `event_type='time_block_restoration'` and full before/after details for compliance.

Portal-side, this triggers the existing `mark_superseded_on_change` and `handle_appointment_status_completion` flows correctly because the row is moving back into a non-terminal state.

---

### Operator workflow (what the team actually clicks)

A new admin-only page `/admin/block-incident-recovery` with three buttons:

1. **Run audit** → invokes `audit-time-block-cancellations` in `mode=audit`, system-wide, downloads CSV. No writes.
2. **Dry-run restore** → invokes new `restore-block-incident-appointments` in `mode=dry_run`. For each row, returns what *would* happen (PATCH vs CREATE vs slot_taken vs already_confirmed). No writes.
3. **Execute restore** → same fn in `mode=execute`. Requires typing the suspect count from the dry-run as confirmation. Processes in batches of 25 with a progress UI; per-row result is logged.

Page also shows last run summary: total restored, slot_taken, errors, per-clinic breakdown.

---

### Technical details (for engineers)

**New edge function**: `restore-block-incident-appointments`
- Input: `{ mode: 'dry_run'|'execute', project_name?, appointment_ids?, since?, dnd_suppress?: boolean, dnd_window_hours?: number }`
- For each suspect:
  1. Fetch GHL appointment by ID
  2. If `appointmentStatus !== 'cancelled'`, skip (`already_active`)
  3. PATCH status back to `confirmed` (or recreate if 404). Capture new ID if recreated.
  4. PUT contact tag `lovable_block_incident_restored`
  5. If `dnd_suppress`, call `update-ghl-contact-dnd` with `enable_dnd=true` and schedule a follow-up record in a new lightweight `pending_dnd_releases` table (`contact_id`, `project_name`, `release_at`)
  6. Update `all_appointments` row + write note + audit log
- Returns per-row result array
- Concurrency: 5 GHL calls in flight max (existing rate-limit pattern in other GHL fns)

**Extend `audit-time-block-cancellations`**:
- Add signature B (block-overlap join). Pure SQL, no new fetches needed.
- Add `format=csv` query param that returns CSV instead of JSON.
- Remove the `'Welcome Call' status` filter so it catches Confirmed/Pending victims of signature B.

**New scheduled fn**: `release-block-incident-dnd` — runs every 15 min via pg_cron, finds rows in `pending_dnd_releases` where `release_at <= now()`, calls `update-ghl-contact-dnd` with `enable_dnd=false`, deletes the row.

**New table**:
```sql
create table public.pending_dnd_releases (
  id uuid primary key default gen_random_uuid(),
  ghl_contact_id text not null,
  project_name text not null,
  release_at timestamptz not null,
  released_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.pending_dnd_releases (release_at) where released_at is null;
```
RLS: admin-only.

**Frontend**: new route `src/pages/admin/BlockIncidentRecovery.tsx` gated by `has_role(uid, 'admin')`. Calls the three edge functions, shows progress, downloads CSV.

**Reschedule workflow filter (manual one-time op task, NOT code)**: in GHL, edit each clinic's reschedule workflow → add filter "Contact tag does not contain `lovable_block_incident_restored`". This is the only manual step required. The edge function adds the tag; the workflow filter is what makes the tag mean something.

---

### Safety / rollback

- All writes are gated behind `mode=execute` + typed count confirmation.
- Every change is logged in `security_audit_log` with full before/after, so a `mode=rollback` can be added later that reverses any specific batch.
- DND is the only "side effect" with a TTL — the auto-release function ensures patients aren't permanently muted even if the team forgets.
- If GHL is rate-limiting, the function exits cleanly with a partial result and can be re-invoked to resume (idempotent: it skips rows already restored).

---

### Out of scope for this plan

- Sending an apology SMS/email to affected patients (clinic comms decision, not a code change).
- Rebuilding the time blocks themselves — they remain as-is on the calendar; we only restore the patient appointments. If a real conflict still exists, that surfaces on the calendar UI for the clinic to resolve.

---

### Approve to proceed

On approval I'll:
1. Extend the audit fn (signature B + CSV)
2. Build `restore-block-incident-appointments` (dry-run + execute)
3. Add `pending_dnd_releases` table + `release-block-incident-dnd` cron fn
4. Build the `/admin/block-incident-recovery` UI
5. Run system-wide audit, share the CSV, then run dry-run scoped to VIM first for sign-off before executing.
