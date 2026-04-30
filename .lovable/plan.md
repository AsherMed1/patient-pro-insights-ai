# Fix: VA role cannot save appointment notes

## Root cause

The `appointment_notes` table has RLS policies for the VA role covering SELECT, UPDATE, and DELETE — but **no INSERT policy**. When Gloria (VA) clicks "Add Note", the insert is blocked by RLS, producing the "Failed to add note" error. Insurance saves work because they write to a different table where VA permissions are correctly set.

## Fix

Add a single migration creating an INSERT policy for the VA role on `appointment_notes`:

```sql
CREATE POLICY "VA_insert_appointment_notes"
ON public.appointment_notes
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'va'::app_role));
```

This mirrors the existing `VA_update_appointment_notes` and `VA_delete_appointment_notes` policies, granting VAs cross-project insert access consistent with the VA role definition (view/edit/delete any appointment note across all projects).

## Verification

After applying:
1. Gloria retries adding a note on the CHVC patient — the note saves and appears in the Internal Notes list.
2. Existing admin/agent/project_user insert behavior is unaffected (their policies remain unchanged).

No frontend code changes required.
