## Problem

Editing a patient name from a Project Page (inline pencil edit on the appointment card) only updates the portal DB row. It does not push to GHL and does not update sibling appointments — that's why QA Operations (which reads a different appointment row for the same `ghl_id`) still shows the old name.

The QA Operations edit works because it calls the `update-ghl-contact-name` edge function, which:
1. PATCHes GHL contact (`firstName`, `lastName`, `name`)
2. Updates the current appointment (`lead_name` + `parsed_contact_info.name` + `name_last_synced_at`)
3. Updates all sibling appointments sharing the same `ghl_id`
4. Writes an audit note

The project-page edit skips all of this — it just does a local `supabase.from('all_appointments').update(...)` on one row.

### Root cause (single line)

`updateAppointmentName` in `src/components/AllAppointmentsManager.tsx` (line 1317) writes directly to Supabase instead of invoking the `update-ghl-contact-name` edge function.

## Fix

Route the inline name edit through the same edge function QA Operations uses.

### Change

**`src/components/AllAppointmentsManager.tsx` — `updateAppointmentName`**

Replace the direct Supabase `update` with `supabase.functions.invoke('update-ghl-contact-name', { body: { appointment_id, new_name, user_name } })`.

- Pass `user_name` from `useUserAttribution` (same as QA Operations) so the audit note is attributed correctly.
- On success, still call `fetchAppointments()`, `fetchTabCounts()`, and `onDataChanged?.()`.
- Surface partial-success info from the edge function (`ghl_pushed`, `ghl_skipped_reason`) in the toast when relevant (e.g., "Updated in portal only — no GHL contact linked" if `ghl_skipped_reason === 'no_ghl_id'`).
- Read `FunctionsHttpError` context on failure so real error text (not "non-2xx status") shows.

No changes to `AppointmentCard.tsx` — it already calls `onUpdateName(id, name)`. No DB migration. No changes to the edge function (already deployed and working from QA Operations).

## Result

- Editing a name on the Project Portal appointment card pushes to GHL, updates every sibling row for the same patient, writes an audit note, and — because QA Operations subscribes to `qa_cases`/appointments realtime — the QA drawer reflects the new name too.
- Behavior matches the QA Operations edit path exactly (single source of truth for name sync).
