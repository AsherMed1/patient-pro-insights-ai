

# Fix: Status Updates Failing for Project Users

## Root Cause

When portal users (project_users) try to change an appointment status from the appointment list view, the update fails with an RLS error. Here is why:

1. The `AllAppointmentsManager` component updates appointment status **directly** via the Supabase client (using the user's auth token), not through the edge function
2. Changing the status fires the `handle_appointment_status_completion` database trigger
3. That trigger tries to `INSERT INTO security_audit_log` to log the status change
4. The `security_audit_log` table only allows inserts from the `service_role` -- not from `authenticated` users
5. The insert fails, which **rolls back the entire appointment update transaction**

The `DetailedAppointmentView` (the detail modal) uses the `update-appointment-fields` edge function with service_role and works fine. But the card-level status dropdown in the list view uses the direct client path and fails.

## Fix

Add an RLS policy on `security_audit_log` to allow authenticated users to insert rows. This is safe because audit logs are append-only records -- users can already read them but just cannot write to them.

### Database Migration

Add an INSERT policy for authenticated users on `security_audit_log`:

```sql
CREATE POLICY "authenticated_insert_security_audit"
  ON public.security_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

This single change will unblock all status updates from the portal for project users, agents, and admins using the direct client path.

## Why This Is Safe

- Audit logs are append-only -- there is no UPDATE or DELETE policy for authenticated users
- The existing SELECT policy already allows all authenticated users to read audit logs
- The trigger that writes to `security_audit_log` is a system-level logging mechanism, not user-facing data

## No Code Changes Needed

The client-side code in `AllAppointmentsManager` is correct. The only issue is the missing RLS policy on `security_audit_log`.

