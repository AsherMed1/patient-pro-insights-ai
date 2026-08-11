# Fix: Setter test account hitting the "No Access" screen

## What I found

Your Test User account is set up correctly:
- Role: Setter (`review_only`), assigned 5 projects, created 6/24/2026.
- Its role row exists in the database and the table permissions are correct.

So no, the account is not actually missing access. The "No Access" screen appears because of a **timing race at sign-in**, not a permissions problem.

Evidence: the database log at the moment of that login shows a request rejected as a *signed-out* request. The portal fired its data queries before the freshly issued session was attached, so the role lookup came back empty. The role hook treats an empty result as "this user has no role at all" and never retries — so the page sticks on "No Access" until a manual reload.

## Fix

Make the role lookup resilient instead of one-shot:

- Treat "no role row returned" as *unknown* rather than *no access* on the first attempt, and retry a couple of times with a short backoff before showing the No Access screen.
- Re-run the role lookup when the auth session changes (sign-in and token refresh), so a late-arriving session immediately resolves the role.
- Only show the No Access screen once a lookup completes with a valid session and genuinely finds no role.
- Add a "Retry" button on the No Access screen alongside Sign Out, so anyone who still lands there can recover without signing out.

## Technical notes

- All changes in `src/hooks/useRole.tsx` plus the No Access block in `src/pages/Index.tsx`.
- In `useRole`: replace `.single()` with `.maybeSingle()`, track an attempt counter, retry on `null` role or error (up to ~3 attempts, ~600ms apart), and subscribe to `supabase.auth.onAuthStateChange` (`SIGNED_IN` / `TOKEN_REFRESHED`) to re-trigger the fetch.
- Keep `loading` true while retries are pending so the dashboard shows the spinner rather than the No Access screen.
- No database or policy changes — the data and grants are already correct.
