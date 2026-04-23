

## Calendar Blocks Auto-Cancelling Confirmed Appointments in GHL — Investigation & Fix

### Root cause confirmed

**Verified data for both impacted patients (project: Vascular Institute of Michigan):**

| Patient | Appt Date / Time | Calendar | Status in Portal | `was_ever_confirmed` |
|---|---|---|---|---|
| Penny Walt | May 5, 8:00 AM | Flint, MI | **Welcome Call** | true |
| Richard Morgan | May 18, 11:00 AM | Flint, MI | **Welcome Call** | true |

**Verified blocks created by clinic on Apr 21:**

| Date | Calendar | Block Window | Block GHL ID |
|---|---|---|---|
| May 5 | Flint, MI | **7:00 AM – 9:00 AM** | 7dQZcQwpRkKPuSvpjPoN |
| May 5 | Flint, MI | 9:30 AM – 12:00 PM | lz8Kibm800WD5tLeWXWH |
| May 5 | Flint, MI | 12:00 PM – 5:00 PM | jFtnPLMGBY0Njz5xTPyp |
| May 18 | Flint, MI | (covers 11:00 AM) | cigZP7YCNgY6COvhMaRm |

Penny's 8 AM falls inside the **7–9 AM** block. Richard's 11 AM falls inside his block window. Both portal records still show `Welcome Call` because the conflict scan in `blockConflictScan.ts` correctly excluded them. **Portal logic is fine — the cancellation happened on the GHL side.**

### Why GHL cancelled them

In `supabase/functions/create-ghl-appointment/index.ts` we POST to GHL's `/calendars/events/block-slots` endpoint with the clinic's chosen window. **GHL's block-slots endpoint behavior:** when a block is placed over an existing appointment slot, GHL silently cancels (or detaches) any overlapping appointment events on that user/calendar. The portal never sees a cancellation webhook for those because GHL treats it as "owner of the calendar said this time is unavailable now."

We are also calling block-slots on **every team member** of the calendar in fallback mode (lines 330-381), which guarantees the patient's assigned user gets blocked regardless. This compounds the issue.

So today's behavior:
- **Portal:** correctly skips confirmed/Welcome Call records → status stays `Welcome Call`
- **GHL:** cancels the underlying patient event because the block overlaps it
- **Result:** Portal and GHL silently desync. The clinic has no idea.

### What needs to change

#### 1. Pre-flight check before sending the block to GHL (the fix)

In `ReserveTimeBlockDialog.tsx`, expand the conflict scan to cover **ALL non-terminal patient appointments** (not just unconfirmed) that overlap the proposed block window — same project, same calendar, same date, time inside any range, `is_reserved_block = false`.

**Two-tier conflict surface in the dialog:**

- **Hard blockers (cannot proceed):** confirmed-tier statuses → `Welcome Call`, `Confirmed`, `Pending` confirmation, `Scheduled`, anything with `was_ever_confirmed = true` and no terminal status. Show these at the top in red with a message: *"These confirmed appointments would be cancelled in GoHighLevel if you create this block. Reschedule them first or shrink your block window."* No checkbox to override. Block creation button disabled until either (a) the user reduces the time range to no longer overlap, or (b) the user removes those calendars from the selection.
- **Soft conflicts (existing behavior):** truly unconfirmed (`status = ''` or `'pending'`) → keep the existing "Auto-cancel all and notify patients" checkbox flow.

#### 2. Update `blockConflictScan.ts`

Return two arrays instead of one: `hardConflicts` (would be silently cancelled by GHL) and `softConflicts` (currently handled). Hard conflict detection:

```text
status NOT IN (terminal statuses: Cancelled, No Show, Showed, Won, OON, Do Not Call, Rescheduled)
AND status NOT IN ('', 'pending')   // those are soft
AND is_reserved_block = false
AND requested_time inside any block range
```

Terminal statuses are pulled from the existing memory `mem://data-integrity/terminal-status-definition`.

#### 3. Update `BlockConflictDialog.tsx`

Render two sections:
- 🔴 **"Will be cancelled in GoHighLevel — fix before continuing"** — list of hard conflicts with patient name, time, calendar, status badge. No way to proceed past these.
- 🟡 **"Unconfirmed appointments overlap this block"** — current UI, with the existing checkbox.

If only hard conflicts exist → primary button changes to "Adjust Block" and just closes the conflict dialog so the user can edit the time range or deselect calendars. If only soft conflicts → unchanged from today. If both → must resolve hard first.

#### 4. Manual recovery for Penny & Richard

Their portal records are still correct (`Welcome Call`). Their **GHL events are cancelled**. Two options:

- **Recommended:** add a one-time utility `src/utils/restoreVimMayBlockVictims.ts` that calls `update-ghl-appointment` with `status = 'Confirmed'` and the original date/time for both records. This re-creates the GHL event (or restores the cancelled one to confirmed) so GHL and portal are back in sync. Plus an internal note: *"GHL event auto-cancelled by clinic block on Apr 21 — restored by support. Underlying bug fixed in block conflict scanner."*
- **Alternative:** clinic recreates the appointments manually in GHL. Faster for us, more work for the clinic.

I recommend the utility route.

#### 5. Telemetry to catch future cases

Add a row to `security_audit_log` whenever a block is created over a non-reserved appointment slot, even after the new guards land — gives us a paper trail if GHL changes behavior or our scan misses an edge case. Event type: `block_overlap_warning`.

### Files touched

| File | Change |
|---|---|
| `src/components/appointments/blockConflictScan.ts` | Return `{ hardConflicts, softConflicts }`. Add terminal-status exclusion list. |
| `src/components/appointments/BlockConflictDialog.tsx` | Two-section UI, hard conflicts block submission. |
| `src/components/appointments/ReserveTimeBlockDialog.tsx` | Wire new return shape; disable submit when hard conflicts exist; updated toast copy. |
| `supabase/functions/create-ghl-appointment/index.ts` | Insert `block_overlap_warning` audit row when GHL block POST succeeds and we know an overlap existed. |
| `src/utils/restoreVimMayBlockVictims.ts` (new) | One-time restore for Penny Walt + Richard Morgan via `update-ghl-appointment`. |

### Out of scope (proposed for follow-up)

- Reaching into GHL via API to detect already-cancelled-by-block events across all clinics retroactively. Possible but big — quote separately if you want a sweep.
- Changing GHL's underlying behavior. We can't.
- Allowing the clinic to override the hard block with an "I understand, cancel them anyway" checkbox. Deliberately omitting — the whole point of clinic complaints is that this happens silently. If you want this option, say so and I'll add a confirm-twice flow.

### Risk

Low. The conflict scan and dialog already exist and are well-isolated. New behavior is strictly more conservative — we **prevent** an already-broken outcome. No data migrations. The one-time restore utility is reversible (it's just an `update-ghl-appointment` call).

### Approve to proceed

Approve and I'll switch to default mode and ship: (1) the dual-tier scan, (2) the updated dialog, (3) the audit telemetry, (4) the restore utility for Penny & Richard, run it once, and report back with the GHL response payloads to confirm both events are back to confirmed.

