## Root cause

For Christa Hagemeier (Ozark, appointment `3c5afa52…`), every "Cancelled → Confirmed" change Ivy S made was logged as a note but the actual appointment row never changed:

- `all_appointments.updated_at` is stuck at **Apr 30 12:23**, before Ivy's three Apr 30 attempts and the May 3 attempt.
- `security_audit_log` (written by the `handle_appointment_status_completion` trigger on every status update) shows the last real status change was **Apr 29 14:30 Confirmed → Cancelled**. Nothing after that.
- Ivy S has only the `va` role.
- RLS on `all_appointments`:
  - VAs have a SELECT policy (`VA view all appointments`).
  - VAs have **no UPDATE policy**. Admin/agent/project_user policies all exclude VAs.
- RLS on `appointment_notes`: VAs have full insert/update/delete (`VA_insert_appointment_notes`, etc.).

So the UI's `supabase.from('all_appointments').update({status: 'Confirmed'})` returns success with **0 rows affected** (PostgREST does not error on RLS-filtered no-ops), the toast looks fine, the system note insert succeeds, but the row is unchanged. On the next refetch the UI reverts to "Cancelled". This will silently affect every VA on every clinic, not just Ozark/Christa.

This also conflicts with the existing memory rule that VAs can manage appointment notes across all projects — note management implicitly assumes they can manage the appointments those notes belong to.

## Fix

### 1. Add VA RLS policies on `all_appointments` (migration)

Mirror the existing VA pattern (full access, since VAs already see every appointment):

```sql
CREATE POLICY "VA update all appointments"
  ON public.all_appointments
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'va'))
  WITH CHECK (public.has_role(auth.uid(), 'va'));

CREATE POLICY "VA insert all appointments"
  ON public.all_appointments
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'va'));

CREATE POLICY "VA delete all appointments"
  ON public.all_appointments
  FOR DELETE
  USING (public.has_role(auth.uid(), 'va'));
```

(Insert/delete added so VAs can use the same flows as agents — e.g. cancel-as-delete, manual entry. If you'd prefer update-only, say so and I'll trim.)

### 2. Repair Christa Hagemeier's record

Set status back to `Confirmed`, clear `internal_process_complete` and `procedure_ordered`, sync to GHL, and log a system note attributing the fix to support.

```sql
UPDATE public.all_appointments
SET status = 'Confirmed'
WHERE id = '3c5afa52-5b06-4421-98f7-37f0598098df';
```

The `handle_appointment_status_completion` trigger will reset `internal_process_complete = false` and `procedure_ordered = NULL` automatically. We'll also call `update-ghl-appointment` to push the status to GHL (the GHL appt is already Confirmed per Ivy, so this is a safety no-op) and insert an attribution note.

### 3. Harden the UI so this can't fail silently again

In `src/components/AllAppointmentsManager.tsx` (`handleStatusChange`, around line 696), change the update to request the row back and treat `0 rows returned` as an error:

```ts
const { data: updated, error } = await supabase
  .from('all_appointments')
  .update(updateData)
  .eq('id', appointmentId)
  .select('id, status')
  .maybeSingle();

if (error) throw error;
if (!updated) {
  toast({
    title: "Status update blocked",
    description: "You don't have permission to change this appointment's status. Contact an admin.",
    variant: "destructive",
  });
  return; // skip note insert, GHL sync, etc.
}
```

This prevents the "note logged, row unchanged, UI reverts" trap for any future RLS gap.

## Verification

1. As Ivy S (VA), open Christa Hagemeier in Ozark, change status to Confirmed → row stays Confirmed across refresh.
2. `security_audit_log` shows a new `appointment_auto_completed` entry with `old_status: Cancelled`, `new_status: Confirmed`.
3. GHL appointment remains Confirmed (no regression).
4. As a hypothetical user with no update rights, attempting a status change shows the new "Status update blocked" toast instead of silently reverting.

## Memory update

Update `mem://auth/va-role` to record that VAs have full read/insert/update/delete on `all_appointments` (not just notes), so this isn't reintroduced.
