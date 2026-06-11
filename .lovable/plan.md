# Adopt-Slot from Duplicate (No Cancel Workflow)

When a record has a duplicate sibling, give reviewers a one-click way to **pull the correct date/time onto the active record** and **delete the duplicate** — instead of cancelling it, which sends setters into the GHL reschedule workflow by mistake.

## Where the action lives

1. **Review Queue → pending row → expanded "Existing active appointment(s)" panel**
   Each listed duplicate gets a new **"Use this slot"** button next to the existing **View** link.
2. **Appointment list (AllAppointmentsManager) → AppointmentCard**
   When the card's appointment has ≥1 active duplicate (same patient + same project + future date, non-superseded, non-terminal), surface a small amber **"Use slot from duplicate"** action in the card menu. Clicking opens a picker listing the duplicate(s); selecting one runs the same flow.

In both surfaces the user picks **which appointment is the correct/confirmed one**; that row's slot is copied onto the row they're acting from, and the picked row is deleted.

## What gets copied

Only the slot fields — nothing else:
- `date_of_appointment`
- `requested_time`

No calendar/GHL-id/status changes. The adopting record keeps its own status, calendar, GHL link, intake notes, etc. (Confirmed by the user: just the slot.)

## What happens to the source (the picked duplicate)

**Hard delete** from `all_appointments` after the slot copy succeeds. This matches the supervisor workflow ("supervisors delete unwanted duplicates") and deliberately avoids `status='Cancelled'`, which is what triggers the GHL reschedule/cancel automations that setters get confused by.

Guardrails on the delete:
- Only deletable when the source row is **not** the same id as the adopting row.
- Confirmation modal lists exactly what will happen: *"Move {date} {time} onto {adopting patient name}'s record and permanently delete the duplicate {source date/time} record. The deleted record will NOT trigger any cancellation workflow."*
- Action is gated to admin / agent / VA roles (same gate as the existing Replace/Decline actions in ReviewQueue). Non-management roles do not see the button.

## Audit

For each adopt-slot action, write:
1. `appointment_notes` row on the **surviving** appointment:
   `"Adopted slot {oldDate oldTime → newDate newTime} from duplicate record (deleted) — by {userName}"`
2. `log_audit_event` entry with `entity='appointment'`, `action='adopt_slot_from_duplicate'`, metadata including `adopting_appointment_id`, `deleted_appointment_id`, `previous_date`, `previous_time`, `new_date`, `new_time`, `project_name`, `lead_name`.

No `reschedule_history` JSONB entry (kept out per the simpler "note + audit" choice).

## Out of scope

- No GHL outbound call to cancel/delete the source appointment in GoHighLevel. Supervisors continue to clean up GHL manually (current behavior). If a future request wants the source GHL appointment deleted too, that's an additive edge-function call we can wire up separately.
- No change to the existing **Replace existing** / **Keep existing** flow already in ReviewQueue — those stay as-is for cases where the new record is the wrong one.
- No change to inbound GHL webhook duplicate detection.
- No schema changes.

## Technical details

**Files touched**
- `src/components/admin/ReviewQueue.tsx` — add `handleAdoptSlot(adoptingRow, sourceDup)`, a confirmation `Dialog`, and a "Use this slot" button in the existing duplicate-list rendering in the expanded panel.
- `src/components/appointments/AppointmentCard.tsx` — when the parent passes in `duplicates` (see below), render the new menu item and confirmation dialog. Reuse the same handler logic.
- `src/components/AllAppointmentsManager.tsx` (or whichever parent owns the card list) — extend the existing per-row data fetch to compute `duplicatesByApptId` the same way ReviewQueue does, and pass `duplicates={duplicatesByApptId[appt.id] ?? []}` into `AppointmentCard`. If a single-query fan-out is too heavy, add a lazy fetch when the card menu opens.
- `src/components/appointments/types.ts` — extend `AppointmentCardProps` with optional `duplicates?: DuplicateAppt[]` and `onAdoptSlot?: (sourceId: string) => Promise<void>`.

**Handler logic (shared)**
```text
1. Capture previousValues = { date_of_appointment, requested_time } of adopting row.
2. UPDATE all_appointments SET date_of_appointment = src.date_of_appointment,
                                requested_time = src.requested_time,
                                updated_at = now()
   WHERE id = adoptingRow.id;
3. INSERT appointment_notes (appointment_id = adoptingRow.id,
                             note_text = "Adopted slot … — by {userName}",
                             created_by = userId);
4. DELETE FROM all_appointments WHERE id = sourceDup.id;
5. supabase.rpc('log_audit_event', { p_entity:'appointment',
                                     p_action:'adopt_slot_from_duplicate', … });
6. Refresh: fetch() + fetchCounts() in ReviewQueue, or onDataChanged() in AllAppointmentsManager.
```

All four DB statements are issued sequentially with a `processing` flag and a `try/catch` that toasts on failure and skips the delete if the update or note fails.

**Trigger interactions to be aware of (no code change needed, just confirming behavior)**
- `handle_appointment_status_completion` — fires on UPDATE. Date/time-only updates don't change status, so it's a no-op.
- `trigger_auto_ai_parsing` — only resets parsed fields when `patient_intake_notes` changes. Safe.
- `mark_superseded_on_change` — runs on the surviving row; since the adopting row stays non-terminal, it may mark older terminal siblings superseded (desirable). The source row is deleted, not updated, so this trigger doesn't fire on it.
- `trigger_hipaa_audit_appointments` — logs both the UPDATE and the DELETE, which is exactly the audit trail we want.

