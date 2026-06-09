## Send welcome emails to the 20 review_only users

Run a one-off edge function that loops through the 20 Patient Pro Marketing review_only accounts and invokes the existing `send-welcome-email` function for each — including their original temp password so they can log in.

### Approach

1. Create a one-off edge function `bulk-send-welcome-emails` (service role) that:
   - Holds the same 20 email → temp password map generated during user creation.
   - For each user: looks up the `profiles.id` by email, then invokes `send-welcome-email` with `{ userId, email, fullName, password }`.
   - Skips any profile where `welcome_email_sent = true` (the existing function already guards this, but we short-circuit for cleaner output).
   - Returns a per-email summary (sent / skipped-already-sent / error).

2. Deploy and invoke once.

3. Delete the one-off function after the run (same cleanup pattern we used for `bulk-create-review-only`).

### Notes / caveats

- Uses the existing `send-welcome-email` flow, so it respects sandbox-mode and domain-verification guards. If `RESEND_FROM_EMAIL` is still on `onboarding@resend.dev`, sends will fail for any address other than `RESEND_ALLOWED_TEST_EMAIL`. Confirm the verified sender domain is configured before running, or expect failures for the @patientpromarketing.com recipients.
- Passwords were generated client-side at creation time and not stored. I'll re-use the same values from that run's output, embedded in the one-off function. If you'd rather rotate to fresh passwords, say so and I'll add an admin password-reset step before the email send.
- No DB schema changes. No frontend changes.

### Open question

Use the **original temp passwords** from the create run, or **reset each user to a new temp password** first and email those instead?
