# Fix "Failed to delete user from auth"

## What's happening

Deleting a portal user fails at the final step (removing the login account). The cause is confirmed: HIPAA audit records point at the user account, and the database is set up to block deleting an account that still has audit history attached.

For the six accounts you listed there are **8,499 HIPAA audit rows** tied to them, so the delete is rejected every time. Fourteen other tables have the same blocking setup (uploads, reschedules, sessions, etc.) — they currently hold no rows for these six users, but they would cause the same failure later.

The error message the portal shows is also generic — it hides the real database reason.

## Fix

1. **Keep the audit history, release the link.** Change the blocking references so that when an account is deleted the historical row stays but its user link is cleared instead of blocking the delete. Applies to `hipaa_audit_log` and the other 14 tables with the same setup.
2. **Don't lose who did it.** Before clearing the link, stamp the departed user's email and name into each affected audit row's metadata, so the audit trail still identifies the actor after the account is gone. This runs automatically inside the deletion path.
3. **Surface the real error.** Update the delete-user function and the User Management dialog to show the actual database message instead of "Failed to delete user from auth".
4. **Delete the six accounts** once the above is in place, and confirm each is gone from the users list and from the login system.

## Technical detail

- Migration: for each of the 15 `public` FKs to `auth.users` with no delete action (`hipaa_audit_log.user_id`, `user_sessions.user_id`, `patient_data_access.user_id`, `form_submissions.user_id`, `project_user_access.granted_by`, `emr_processing_queue.processed_by`, `appointment_reschedules.requested_by/processed_by`, `task_templates.created_by`, `clinic_onboarding.user_id`, `csv_import_batches.uploaded_by`, `account_manager_appointments.uploaded_by`, `meeting_transcripts.uploaded_by`, `cpl_data.uploaded_by`, `quarterly_strategy_submissions.submitted_by`) drop and recreate with `ON DELETE SET NULL`. All target columns are nullable (`hipaa_audit_log.user_id` verified nullable); any that are `NOT NULL` get relaxed in the same migration.
- `supabase/functions/delete-user/index.ts`: before `auth.admin.deleteUser`, update the user's `hipaa_audit_log` rows with `metadata = metadata || {deleted_user_email, deleted_user_name}`; return `authError.message` in the JSON body.
- `src/components/UserManagement.tsx`: show the returned `error`/`details` text in the destructive toast.
- No RLS or role changes; audit rows remain readable exactly as today.
