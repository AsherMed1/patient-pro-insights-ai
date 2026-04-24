## Goal

Run a controlled, single-patient restoration for **Eugene Schneeberger** (Vascular Institute of Michigan) before any bulk run. This validates the entire pipeline end-to-end on one known case so we catch any GHL-side surprises before touching the rest.

## Patient on file

| Field | Value |
|---|---|
| Appointment ID | `1ac1175c-be6a-40f0-b40f-11454e229f5e` |
| Project | Vascular Institute of Michigan |
| Date / time | 2026-05-20 at 12:00 |
| Calendar | Request Your GAE Consultation at Owosso, MI |
| Current portal status | **Welcome Call** |
| `was_ever_confirmed` | true (matches the incident signature) |
| GHL appointment ID | `kggeic9H4i17UdfXsk2m` |
| GHL contact ID | `SlIK0zXNFmv545RcbKLc` |

This is exactly the profile of a block-incident victim: portal still shows him as an active appointment in a non-Confirmed status, but GHL very likely cancelled the underlying event when the time block was applied.

## Plan

### 1. Add a "single-appointment" entry point on the recovery page
Add a small **"Single appointment restore"** card at the top of `/admin/block-incident-recovery` that accepts:
- An appointment UUID (prefilled with Eugene's id for this run)
- The same DND toggle / hours controls
- Two buttons: **Dry-run this one** and **Execute this one**

Both buttons call the existing `restore-block-incident-appointments` edge function with `appointment_ids: [<id>]` (the function already supports this path via `loadSuspectsFromAudit`), so no new edge function or new logic is needed.

### 2. Run the restore in two passes
1. **Dry-run** for Eugene → expected outcome: `patch` (GHL fetch returns 200 with `appointmentStatus: cancelled`, plan is to PUT it back to `confirmed`). If GHL returns 404 instead, the function will report `recreate` using calendar `Request Your GAE Consultation at Owosso, MI` at 2026-05-20 12:00 → 12:30 ET.
2. **Execute** if the dry-run looks right. The function will:
   - PUT `appointmentStatus: confirmed` on GHL event `kggeic9H4i17UdfXsk2m` (or recreate it on the Owosso GAE calendar if deleted).
   - Tag contact `SlIK0zXNFmv545RcbKLc` with `lovable_block_incident_restored` so the VIM reschedule workflow skips him.
   - Enable SMS/Email/WhatsApp DND on his contact for 24h (queued for auto-release in `pending_dnd_releases`).
   - Update portal row → `status = 'Confirmed'`, clear `cancellation_reason`, append an internal note explaining the restoration, write a `security_audit_log` row.

### 3. Verify
After execute returns, re-query `all_appointments` + `appointment_notes` for the row, and pull the GHL event once more via the audit function with `check_ghl: true` scoped to this single id. Surface a small "Verification" panel on the page showing portal status, GHL status, and whether the restoration tag is present on the contact.

### 4. Manual prerequisite (one-time, before execute)
The VIM GHL **reschedule workflow** must already have the tag-exclusion filter: *Contact tag does not contain `lovable_block_incident_restored`*. If that filter isn't in place yet, executing will still restore the appointment, but the patient could still receive the in-flight reschedule SMS — so we ask the user to confirm this is set on VIM before clicking Execute.

## Technical notes
- No new edge functions, no schema changes. Reuses `restore-block-incident-appointments` with `mode` + `appointment_ids: ['1ac1175c-be6a-40f0-b40f-11454e229f5e']`.
- The single-appointment UI is just a thin wrapper on `supabase.functions.invoke('restore-block-incident-appointments', { body: { mode, appointment_ids: [id], dnd_suppress, dnd_window_hours } })`.
- The existing dry-run / execute summary + per-row detail rendering on the page is reused as-is for the result.
- Concurrency, audit logging, and the `pending_dnd_releases` queue all already work for the single-row case.

## Deliverable
After approval, you'll get:
1. A new "Single appointment restore" card at the top of `/admin/block-incident-recovery`, prefilled with Eugene's appointment id.
2. A dry-run result for Eugene to review.
3. After you click Execute, the GHL event is restored to confirmed, his contact is tagged + DND-suppressed for 24h, and the portal row is set back to Confirmed with an explanatory internal note.
