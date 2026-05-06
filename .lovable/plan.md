# Add GHL Status-Change Audit Notes

## Problem
When GHL pushes a status change (e.g. Confirmed → Cancelled) via webhook, the portal updates the appointment status but does not write a note to the patient record. Today, `ghl-webhook-handler` only writes notes for **reschedules** (date change) and **Welcome Call transitions** — generic status changes are silent.

## Fix
Edit `supabase/functions/ghl-webhook-handler/index.ts`:

1. In `getUpdateableFields(...)` extend the return type to include an optional `statusChangeNote: { appointmentId, fromStatus, toStatus }`.

2. In the existing status-update branch (around line 740-758), when an explicit GHL status change is accepted (i.e. not a portal-only-terminal preserve, and not the Welcome Call branch which already records its own note), capture:
   ```ts
   statusChangeNote = {
     appointmentId: existingAppointment.id,
     fromStatus: existingAppointment.status || 'Unknown',
     toStatus: webhookData.status,
   }
   ```
   Skip if `fromStatus === toStatus` (no real change).

3. Return `statusChangeNote` alongside the other note payloads.

4. In the main `serve` handler (right after the `welcomeCallTransitionNote` insert block, ~line 238), add a parallel insert:
   ```ts
   if (statusChangeNote) {
     const ts = new Date().toLocaleString('en-US', {
       timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short'
     });
     await supabase.from('appointment_notes').insert({
       appointment_id: statusChangeNote.appointmentId,
       note_text: `Status changed from "${statusChangeNote.fromStatus}" to "${statusChangeNote.toStatus}" via GoHighLevel — ${ts}`,
       created_by: 'GoHighLevel',
     });
   }
   ```

5. Destructure `statusChangeNote` from the `getUpdateableFields` call (line 163).

## Guardrails (already in place, preserved)
- Reschedules continue to use the existing reschedule note (no double-note — date-change branch sets status to "Confirmed" but the reschedule note covers it; we skip the new note when `rescheduleNote` exists for the same appointment).
- Welcome Call transitions continue to use their own note (skip new note when `welcomeCallTransitionNote` exists).
- Portal-only terminal preserves (OON / Do Not Call / Cancelled) are NOT logged because the status was not actually changed.

## Memory update
Add a memory entry under `mem://integrations/ghl-webhook-status-change-notes` documenting that all accepted GHL status changes write a `appointment_notes` row attributed to "GoHighLevel".

## Files
- `supabase/functions/ghl-webhook-handler/index.ts` (edit)
- `mem://integrations/ghl-webhook-status-change-notes` (new)
- `mem://index.md` (append memory reference)
