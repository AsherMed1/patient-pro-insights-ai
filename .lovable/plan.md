## Bulk-create 20 review_only users

Add the listed Patient Pro Marketing emails as new users with the `review_only` role so they can access only the Review Queue.

### Approach

Use a one-off admin-authenticated script that calls the existing `create-user-with-role` edge function once per email. That function already:
- Creates the auth user (with a generated temp password + `must_change_password: true`)
- Creates the `profiles` row
- Inserts a `user_roles` row with the chosen role
- Logs to `security_audit_log`

No new tables, RLS, or schema changes needed. No project access is assigned (review_only doesn't need per-project assignment).

### Deduplication

The list contains `jennifer.r@patientpromarketing.com` twice — I'll de-dupe to 20 unique emails before creating.

### Output

A summary table per email: created / already-exists / error, plus the generated temporary password for each newly created user so you can distribute them. Users will be forced to change password on first login.

### Open questions

1. **Welcome email** — should I trigger the existing welcome-email flow for each new user, or just hand you the temp passwords to share manually?
2. **Password delivery** — do you want one shared temp password for all 20, or a unique random password per user (current edge function default)?

Once you confirm, I'll switch to build mode and run the creation.
