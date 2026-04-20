

## Auto-Cancel Unconfirmed Appointments When a Block is Added

### Default behavioral assumptions (called out so client can correct)

These are baked into the plan. Easy to flip — just say so before approval.

| Decision | Default | Why |
|---|---|---|
| What's "unconfirmed" | `Pending` + `null` status only | Confirmed = patient has been spoken to. Auto-cancelling those without a human call is dangerous and contradicts existing terminal-status rules. |
| Match scope | Same calendar(s) being blocked + overlapping time on the blocked date | Matches how the block dialog already targets specific calendars. Won't nuke another location's appts. |
| SMS delivery | Reuse existing `appointment-status-webhook` → GHL workflow | Every cancellation already fires this webhook. Clinics already have GHL workflows that send patient SMS on cancellation. Zero new infra, zero per-clinic Twilio setup, no SMS-pumping risk. |
| Confirmation UX | Preview + confirm dialog before any cancellation | High-stakes operation. Show every affected patient first. |
| Cancellation reason | New system reason: `Auto-cancelled: Clinic blocked time` | Falls in `ALLOW_RESCHEDULE_REASONS` group → does NOT enable DND, leaves patient eligible for reschedule outreach. |

If client wants Confirmed appts also auto-cancelled, or wants Twilio direct, or wants no preview step — say so and we adjust before building.

---

### What the user will see

1. User opens **Reserve Time Block** dialog as today, picks date + time ranges + calendars + reason.
2. Clicks **Reserve**. Before any GHL/local writes happen, the portal runs a **conflict scan**:
   - Finds appts on the selected date(s) where:
     - `project_name` matches
     - `calendar_name` is in the selected calendars (mapped from `calendar_id`)
     - `requested_time` falls inside any selected time range
     - `LOWER(status)` ∈ (`pending`, `null`) AND `is_reserved_block` ≠ true
3. **If 0 conflicts** → submit flows exactly as today (no UX change).
4. **If 1+ conflicts** → new `BlockConflictDialog` opens listing each affected appt:

   ```text
   ⚠️ 4 unconfirmed appointments overlap this block

   ✓ Sarah Jones    9:30 AM   Pending     (770) 555-0142
   ✓ Mike Patel     10:00 AM  No status   (404) 555-0188
   ✓ Linda Chen     2:15 PM   Pending     (470) 555-0301
   ✓ Roy Tate       3:00 PM   Pending     (678) 555-0944

   [☑] Auto-cancel all and notify patients
   [☐] Skip these and just create the block

   [Cancel]   [Continue]
   ```

5. On Continue with auto-cancel checked:
   - Block is created (existing flow).
   - Each affected appt is updated to `status='Cancelled'`, `cancellation_reason='Auto-cancelled: Clinic blocked time'`, internal note added with attribution + block reason.
   - GHL is synced via existing `update-ghl-appointment` (status → cancelled) — same path as manual cancellation.
   - `appointment-status-webhook` fires per appt (already auto-fires today on status change → it's how SMS reaches patients via GHL workflow).
6. Toast: `Block created. 4 appointments cancelled, patients notified via GHL workflow.`

### What the client must do once on the GHL side

Their existing GHL appointment-cancellation workflow already runs on `appointment_status_changed` → `new_status: Cancelled` from our webhook. If a clinic doesn't already send a cancellation SMS, they add an SMS step in that GHL workflow — one-time setup per clinic. **No portal change required after that.**

(If a clinic wants the auto-cancel SMS to be different from a normal cancellation SMS, the webhook payload includes the new `cancellation_reason='Auto-cancelled: Clinic blocked time'` field — they can branch their GHL workflow on it.)

### Files / changes

**New component**
- `src/components/appointments/BlockConflictDialog.tsx` — preview list, checkbox, confirm/cancel.

**New util**
- `src/components/appointments/blockConflictScan.ts` — pure async function: given `(projectName, dateStr, timeRanges, calendarNames)`, returns `Conflict[]` from `all_appointments`.

**Modified**
- `src/components/appointments/ReserveTimeBlockDialog.tsx`
  - Before submit, run `blockConflictScan`.
  - If results > 0, open `BlockConflictDialog` and pause submission until user picks.
  - On confirm-with-cancel, after each successful block creation, batch-cancel the conflicts:
    - Update `all_appointments` (status, cancellation_reason, updated_at).
    - Insert appointment_notes row attributing to current user.
    - Invoke `update-ghl-appointment` per appt (status: Cancelled).
    - Invoke `appointment-status-webhook` per appt (so per-clinic GHL workflow fires for SMS).

**No DB migration needed.** Uses existing columns (`status`, `cancellation_reason`, `is_reserved_block`). Existing trigger `handle_appointment_status_completion` already sets IPC=true on cancel. Existing trigger `auto_resolve_emr_queue_on_terminal_status` already drops them from EMR queue.

**No new edge function needed.** Reuses `update-ghl-appointment` and `appointment-status-webhook`.

### Edge cases handled

- **Block fails on some calendars** (existing partial-failure path) → only auto-cancel for calendars where the block actually succeeded.
- **Time range overlap check** treats `requested_time` as a point: appt at 14:00 inside block 13:00–15:00 = match. Handles HH:MM strings already in DB.
- **Reserved blocks themselves** are excluded (`is_reserved_block ≠ true`) so we don't recursively cancel other blocks.
- **Patient with no phone** → still cancelled, GHL workflow handles "no SMS sent" gracefully (existing behavior).
- **User unchecks "auto-cancel"** → block created, conflicts left alone (current behavior).

### Testing checklist (post-build)

1. Create block on a date with 2 Pending appts on the same calendar → see preview → confirm → both cancel + GHL sync + webhook fires.
2. Create block on a date with 1 Confirmed + 1 Pending appt → only Pending shown in preview.
3. Create block on a date with 0 conflicts → no dialog, behaves exactly like today.
4. Multi-calendar block where conflicts exist on only one calendar → preview only shows that calendar's appts.
5. Verify EMR queue auto-resolves cancelled rows (regression on prior fix).
6. Verify clinic's GHL workflow receives the webhook with `new_status=Cancelled` and `cancellation_reason=Auto-cancelled: Clinic blocked time`.

