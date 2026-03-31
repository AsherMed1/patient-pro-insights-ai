

## Log Cancellation Reason in GHL Notes + Control Reschedule Trigger

### What

1. When an appointment is cancelled, send the cancellation reason as a **note on the GHL contact** so it's visible in GoHighLevel.
2. Add 3 new cancellation reasons that **allow** rescheduling: "Unable to Reach (Multiple Attempts)", "Scheduling Conflict", "Missing Required Information".
3. Add 1 new reason that **blocks** rescheduling: "Disqualified / Do Not Re-engage".
4. For "no re-engage" reasons, set the GHL appointment status to `cancelled` **and** add a GHL contact note flagging "Do Not Reschedule". For reasons that allow rescheduling, just cancel normally.

### Cancellation Reason Categories

**Do NOT reschedule** (6 reasons):
- Not Interested Anymore
- Seeking Treatment Elsewhere
- Lives Too Far / Travel Not Feasible
- Does Not Want to Be Contacted
- Unhappy with Service / Experience
- Disqualified / Do Not Re-engage *(new)*

**Allow reschedule** (4 reasons):
- Unable to Reach (Multiple Attempts) *(new)*
- Scheduling Conflict *(new)*
- Missing Required Information *(new)*
- Other

### Changes

**1. `supabase/functions/update-ghl-appointment/index.ts`**
- Accept new optional param `cancellation_notes` (string) in the request body
- When `cancellation_notes` is provided and the status is being set to `cancelled`, POST a note to the GHL contact via `https://services.leadconnectorhq.com/contacts/{contactId}/notes` with the cancellation reason text
- The contact ID comes from fetching the existing appointment (which has `contactId`)

**2. `src/components/appointments/AppointmentCard.tsx`**
- Update `CANCELLATION_REASONS` array: add the 4 new reasons, organized in two groups (Do Not Reschedule / Allow Reschedule) with visual separators
- In `handleCancelSubmit`: pass `cancellation_reason` and `cancellation_notes` text to the GHL sync call by including them in the `onUpdateStatus` flow
- For "Do Not Reschedule" reasons: also add a GHL contact tag or note "Do Not Reschedule - [reason]" via the edge function

**3. `src/components/appointments/DetailedAppointmentView.tsx`**
- Mirror the same reason list and logic as AppointmentCard

**4. `src/components/AllAppointmentsManager.tsx`**
- Update `updateAppointmentStatus` to accept optional `cancellationReason` and `cancellationNotes`
- Pass these to the `update-ghl-appointment` edge function so the note is created in GHL
- For "no re-engage" reasons, also enable DND on the GHL contact (same as "Does Not Want to Be Contacted" / "Do Not Call")

### Technical Flow

```text
User selects "Cancelled" → Picks reason → Submit
  → DB: status=Cancelled, cancellation_reason=[reason]
  → Portal note: "Cancellation Reason: [reason]. Notes: [notes]"
  → GHL sync: appointmentStatus=cancelled
  → GHL contact note: "Portal Cancellation: [reason]. [notes]"
  → If no-reschedule reason: enable DND on contact → GHL stops outreach
  → If reschedule-eligible reason: no DND, GHL can continue workflows
```

### Files to Edit
- `supabase/functions/update-ghl-appointment/index.ts` — add GHL contact note on cancellation
- `src/components/appointments/AppointmentCard.tsx` — new reasons + pass data through
- `src/components/appointments/DetailedAppointmentView.tsx` — same updates
- `src/components/AllAppointmentsManager.tsx` — accept and forward cancellation data to edge function

