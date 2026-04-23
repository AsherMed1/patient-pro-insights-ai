

## Duplicate Appointments — Stop Creating Them, Hide the Stale Ones, Surface the Active Record

### What's broken

Two intertwined problems making clinics edit the wrong record:

**1. The portal keeps creating new rows instead of reactivating cancelled ones.**
When an appointment is cancelled and the patient later uploads insurance (or the setter rebooks), GHL fires an `AppointmentCreate` webhook with a **new** `ghl_appointment_id`. `ghl-webhook-handler` looks up by that ID, finds nothing, and inserts a new row. The old cancelled row stays. Result: two rows, same patient, same project.

**2. The working tabs (New / Needs Review / Future) show both rows.**
`AllAppointmentsManager.tsx` filters by `status` and `internal_process_complete` — never by "is this the latest record for this patient?" So clinics see the locked Cancelled row sitting next to the active Confirmed row with no visual cue that one supersedes the other. They click the wrong one, edits don't stick, complaint files.

A 30-day database scan confirms this is widespread (Mark Bindah w/ 4 records, Sally Lutchman w/ Cancelled+Confirmed same day, Chris Bynum w/ 3 cancelled rows, etc).

### Fix — 3 layers, lowest-risk first

#### Layer 1 — Stop creating new dupes (webhook reactivation)
In `supabase/functions/ghl-webhook-handler/index.ts`, extend `findExistingAppointment`: when a new `ghl_appointment_id` doesn't match anything, do a secondary lookup for an existing record with same `ghl_id` (contact) + same `project_name` + terminal status (Cancelled / No Show / Rescheduled) created within the last 60 days.

If found → **update that row in place**: new `ghl_appointment_id`, new date/time, status → `Confirmed`, `internal_process_complete` → false, append to `reschedule_history`, internal note "Reactivated from cancelled — new GHL event {id}". Skip if the match has `was_ever_confirmed = true` AND is the newer of the pair (don't accidentally revive a stale row).

This kills the root cause for all future webhooks. Zero schema changes.

#### Layer 2 — Hide stale duplicates from working views
Migration adds:
- `all_appointments.is_superseded boolean default false` + index
- Trigger `mark_superseded_on_change` runs on INSERT/UPDATE: for each `(ghl_id OR lead_name+lead_phone_number, project_name)` group, if there's a non-terminal record AND older terminal records exist → flag the older terminal records as `is_superseded = true`. Both records terminal → leave alone (legitimate history). Both non-terminal → leave alone (legit consult + follow-up).

UI filter changes in `AllAppointmentsManager.tsx`:
- Add `.eq('is_superseded', false)` to **New**, **Needs Review**, **Future Appointments** queries
- Add same filter to calendar appointment queries (`useCalendarAppointments.tsx`, `UpcomingEventsPanel.tsx`)
- Keep superseded rows visible in **All**, **Completed**, and the patient appointment history timeline

`src/components/appointments/types.ts` gets `is_superseded?: boolean` added to `AllAppointment`.

#### Layer 3 — Visual distinction on the cards that remain visible
`AppointmentCard.tsx` and `DetailedAppointmentView.tsx`:
- When `is_superseded = true`: muted/greyed background, "Superseded by newer appointment" pill linking to the active record's ID
- Disable edit affordances (status dropdown, date editor) — replace with read-only badges
- Tooltip: "This record is locked. The active appointment for this patient is on [date]."

#### One-time backfill
`src/utils/backfillSupersededAppointments.ts` — runs the same grouping logic over all existing records, dry-run first showing counts grouped by project, then executes after user reviews. Idempotent — safe to re-run.

### What clinics will see after

| View | Before | After |
|---|---|---|
| New / Needs Review / Future / Calendar | All rows including locked dupes | Only the active record per patient |
| All / Completed / History timeline | All rows | All rows + "Superseded" badge on older ones |
| Sally Lutchman example | Cancelled May 8 + Confirmed May 8 both editable | Only Confirmed May 8 in working tabs; Cancelled visible in All with badge |
| Future patient uploads insurance after cancel | New duplicate row created | Existing cancelled row reactivated in place — no dupe |

### Files touched

| File | Change |
|---|---|
| Migration | Add `is_superseded` column, index, `mark_superseded_on_change` trigger |
| `supabase/functions/ghl-webhook-handler/index.ts` | Terminal-status reactivation lookup in `findExistingAppointment` + reactivation upsert path |
| `src/components/AllAppointmentsManager.tsx` | Filter `is_superseded = false` from working tab queries |
| `src/hooks/useCalendarAppointments.tsx` + `src/components/appointments/UpcomingEventsPanel.tsx` | Same filter for calendar views |
| `src/components/appointments/AppointmentCard.tsx` | Superseded styling, lock state, link to active record |
| `src/components/appointments/DetailedAppointmentView.tsx` | Same superseded handling on detail view |
| `src/components/appointments/types.ts` | Add `is_superseded?: boolean` |
| `src/utils/backfillSupersededAppointments.ts` (new) | Dry-run + execute backfill, runnable from console |

### Edge cases handled
- Two genuine future appointments (consult + follow-up): both non-terminal → neither marked superseded
- Patient rescheduled multiple times: only newest active is "Active"; older Cancelled/Rescheduled rows superseded
- Manual cancel followed by GHL rebook: Layer 1 reactivates instead of creating a dupe
- Cross-project records for same person: scoped by `project_name` so they stay separate
- `was_ever_confirmed = true` records never get superseded by an older sibling

### Out of scope
- Hard-deleting cancelled rows (data loss, breaks HIPAA audit)
- Changing the GHL-side cancel-then-create behavior (out of our control)
- Reworking the "locked when cancelled" UX — the lock is intentional; the fix is making sure clinics never see the locked one in their queue

### Risk
Low-medium. Layer 1 is the only behavior change to live writes — guarded by 60-day window + `was_ever_confirmed` check. Layers 2/3 are additive (new column, new filter, new badge). Worst case: a row gets incorrectly marked superseded → reversible with a one-line SQL update, no data loss.

### Rollout order
Migration → webhook reactivation → UI filters + superseded badge → backfill dry-run report for review → execute backfill.

### Approve to proceed
Approve the full 3-layer plan, or say "Layer 1 only" to ship just the webhook reactivation first and tackle the UI hiding + backfill after.

