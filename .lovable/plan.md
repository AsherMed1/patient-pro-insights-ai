## Time Blocks Silently Cancelling Confirmed Appointments — Containment, Audit & Recovery

### What happened

The 13 affected patients all share the **exact same fingerprint** in our audit log:

1. Originally `Confirmed` (GHL status synced to portal)
2. Manually moved to `Welcome Call` in the portal (front-desk reached out)
3. On **Apr 21, 2026 between 13:05–13:20 UTC**, bulk time-block creation ran for VIM (Flint + Owosso GAE calendars) for Apr 27, 28, 30, May 7, 19, 20, June 10
4. GHL silently cancelled every overlapping appointment (this is GHL's documented behavior when a calendar block is posted over an active event)
5. The GHL "Cancelled" webhook arrived back at the portal (visible in `security_audit_log`) — but was silently dropped because of the `Welcome Call` guard bug
6. Portal still shows `Welcome Call` while GHL shows `Cancelled` and patients are now getting cancellation SMS

This is **the exact same root cause** as the Oralia Miller case from yesterday — but the time-block flow is what mass-triggered it.

### Two bugs combined to cause this

**Bug 1 — already fixed yesterday:** `ghl-webhook-handler` had `'welcome call'` in `portalOnlyStatuses`, so GHL → portal cancellation sync was suppressed for any appointment in Welcome Call. Patched and deployed.

**Bug 2 — partially fixed Apr 23, full audit needed now:** Before Apr 23 18:23 UTC, `blockConflictScan.ts` only treated `''` and `'pending'` as conflicts. Welcome Call, Confirmed, Scheduled, and any non-pending status were **invisible** to the conflict-detection scan, so the dialog showed "no conflicts" and the user proceeded straight to GHL block creation. The current scan (Apr 23) correctly flags Welcome Call/Confirmed/Scheduled as **hard conflicts** and refuses to create the block. So new blocks are protected — only retroactive cleanup remains.

### Plan — 4 phases

#### Phase 1: Hard-conflict scan covers ALL confirmed-tier statuses (verify + extend)

Verify the current `blockConflictScan.ts` correctly treats any of these as hard conflicts:
- `Confirmed`, `Welcome Call`, `Scheduled`, `Pending` (when `was_ever_confirmed = true`), and any non-terminal status

The current logic (in repo) does this implicitly — anything not in `TERMINAL_STATUSES` and not in `SOFT_STATUSES` becomes hard. Plus we already pull `was_ever_confirmed` and surface it on the conflict object. Add one extra safeguard: **promote any `''` or `'pending'` row with `was_ever_confirmed = true` from soft → hard**, so a once-confirmed-but-currently-pending row is also protected. This is the only gap.

#### Phase 2: Full historical audit across ALL clinics

Run a single SQL audit to identify every row with the same fingerprint as the 13 VIM patients. The fingerprint:

```sql
-- Appointments where:
--   (a) status is currently a "still active in portal" tier
--   (b) was_ever_confirmed = true
--   (c) is_superseded = false
--   (d) updated_at is in a window where security_audit_log shows
--       multiple consecutive same-status writes (the GHL-cancel-suppressed signature)
SELECT a.project_name, a.id, a.lead_name, a.date_of_appointment,
       a.requested_time, a.status, a.calendar_name, a.ghl_appointment_id,
       a.updated_at,
       (SELECT count(*) FROM security_audit_log s
         WHERE s.event_type = 'appointment_auto_completed'
           AND s.details->>'appointment_id' = a.id::text
           AND s.details->>'old_status' = s.details->>'new_status'
           AND s.created_at BETWEEN a.updated_at - interval '5 minutes'
                                AND a.updated_at + interval '5 minutes'
       ) AS suppressed_webhook_hits
FROM all_appointments a
WHERE a.status IN ('Welcome Call','Confirmed','Scheduled','Pending')
  AND a.was_ever_confirmed = true
  AND a.is_superseded = false
  AND a.is_reserved_block = false
HAVING suppressed_webhook_hits >= 2;
```

We then intersect with **time-block creation windows** (where `is_reserved_block = true AND created_at` is in the same minute as the suppressed webhook hits) to confirm the cause was a block, vs. some other GHL-side cancel.

Output: a per-clinic, per-patient CSV of all affected appointments — VIM + every other project.

#### Phase 3: Recovery — re-validate against GHL and reconcile

For each affected appointment from Phase 2:

1. **Query GHL `GET /calendars/events/appointments/{ghl_appointment_id}`** to get the current `appointmentStatus`. (Cheap. We already have the helper in `update-ghl-appointment`.)
2. **Branch on what GHL says:**
   - **GHL says `cancelled`** → portal status set to `Cancelled`, `cancellation_reason` set to `"Auto-cancelled by clinic time block on <date> — GHL silently cancelled, was a confirmed/welcome-call appointment"`, internal note attributing the change to the time-block backfill, and **flag in a new `recovery_needed` column or note** so clinic staff see it as needing manual rebooking. **Do not attempt to resurrect in GHL** — the time slot is now legitimately blocked, and a resurrected event would conflict.
   - **GHL says anything else** (still `confirmed`, `showed`, etc.) → no action; portal already shows the closest-to-truth status.
3. Generate a Slack-able summary report per project: "X confirmed appointments were silently cancelled by time blocks between <range>. They are now marked Cancelled in the portal. Please rebook these patients."

This is reversible — if a clinic insists on resurrecting a patient in GHL, we do it case-by-case with `update-ghl-appointment` (which already uses `ignoreFreeSlotValidation: true`).

#### Phase 4: Defense-in-depth (so this can never recur)

- Already in place (yesterday's fix): GHL → portal Welcome Call no longer blocks status sync.
- Already in place (Apr 23): hard-conflict scan stops the block dialog when ANY confirmed-tier appointment overlaps.
- Add (this PR): the `was_ever_confirmed`-promotion-to-hard described in Phase 1.
- Add (this PR): in `cancelConflictingAppointments` (the auto-cancel path inside `ReserveTimeBlockDialog`), refuse to operate on any conflict that is NOT in soft tier — even if it's somehow passed in. Belt and suspenders.
- Add (this PR): server-side guard in `create-ghl-appointment` (the function that posts the block to GHL): before calling GHL's block endpoint, re-run the same overlap query the client ran, and **abort with a 409 if any non-terminal/`was_ever_confirmed` patient appointments overlap**, regardless of what the client sent. This is the canonical safeguard: even a stale frontend or an external script can no longer accidentally trigger this.

### Files touched

| File | Change |
|---|---|
| `src/components/appointments/blockConflictScan.ts` | Promote `was_ever_confirmed` soft conflicts to hard. ~5 lines. |
| `src/components/appointments/ReserveTimeBlockDialog.tsx` | In `cancelConflictingAppointments`, double-check each conflict is soft tier; skip + log otherwise. ~10 lines. |
| `supabase/functions/create-ghl-appointment/index.ts` | Server-side overlap re-scan when `is_reserved_block = true`; abort with 409 if confirmed-tier overlap found. ~40 lines. |
| New edge function `audit-time-block-cancellations` | One-off audit + recovery worker. Pulls candidates, queries GHL for each, updates portal records, writes internal notes, returns CSV summary. Triggered manually. |
| One-time SQL via migration | Run audit query above, export results, then update each affected portal row to `Cancelled` with attribution note and `recovery_needed` flag. |
| `mem://features/bulk-calendar-blocking` | Update memory: confirmed-tier appointments are protected from block creation; backend re-validates. |

### Risk

- **Phase 2 (audit)** is read-only. Zero risk.
- **Phase 3 (reconciliation)** changes portal statuses to match what GHL already says. Reversible (we have the prior status in `security_audit_log` and `appointment_history`). It does NOT cancel anything in GHL — it only mirrors GHL's existing state into the portal.
- **Phase 4 (server-side guard)** could theoretically reject legitimate block creation if the re-scan disagrees with the client. We mitigate by returning the conflict list in the 409 response so the UI can show it.

### What this does NOT do

- Does **not** silently re-create cancelled GHL events. Restoring an event in a now-blocked slot would re-trigger the same GHL cancel cascade and cause more confusion. We surface the affected patients to clinic staff for manual rebooking instead.
- Does **not** touch terminal-status appointments (Cancelled, Showed, OON, etc.) — those are correctly settled.

### Approve to proceed

On approval I'll switch to default mode and execute in this order:
1. Ship code changes (Phase 1 + 4 client + server guards).
2. Deploy `audit-time-block-cancellations` edge function.
3. Run audit; share the per-clinic count + CSV before any data is mutated.
4. After you OK the audit results, run the reconciliation; report counts back per clinic.
5. Update memory.
