# Fix "Comment not sent — Failed to send a request to the Edge Function"

## What we know so far

- The `post-controlhub-comment` function **is deployed and reachable**: an OPTIONS preflight from the published origin returns `200` with correct CORS headers, and an unauthenticated POST returns `401`.
- The ControlHub endpoint `https://afduvfbmompcttptcjli.supabase.co/functions/v1/receive-external-comment` responds (401 without the API key), so it exists.
- Edge logs for `post-controlhub-comment` around the failed attempt (13:15:34–35 UTC) show only `booted` lines — **no request log, no error log, no shutdown**. The function started but produced no output.

"Failed to send a request to the Edge Function" is the client-side error supabase-js raises when the network call itself never completes (worker died / connection dropped), not when the function returns an error code. Combined with the empty logs, the most likely cause is the function hanging or crashing during the outbound call to ControlHub — but this is **not yet confirmed**, so the first step is to make the function tell us.

## Plan

### 1. Make the failure observable
Add structured logging at each stage of `post-controlhub-comment`: request received, auth resolved, case loaded, ControlHub request started, ControlHub response status, DB writes done. Today the function logs nothing on the happy path, so a silent failure is invisible.

### 2. Make the outbound ControlHub call safe
- Wrap the `fetch` to ControlHub in an `AbortController` with a ~15s timeout so it can never hang past the gateway limit.
- Wrap it in try/catch so a network/DNS failure returns a clean JSON error ("Couldn't reach ControlHub") instead of killing the worker.
- Validate `CONTROLHUB_BASE_URL` has no trailing slash before building the URL.

### 3. Make the client show the real reason
In `QATicketPanel.tsx`, when the invoke fails with a fetch-level error (not an HTTP error), show a clearer message ("Couldn't reach the server — please retry") and log the underlying error to the console so it appears in the preview console logs. Keep the existing parsing for HTTP errors.

### 4. Reproduce and confirm
After deploying, post a test comment on the Mohsin Test case (`779b41da-8292-49cb-b636-82379384ef89`, ticket `624a0782-a57a-4a19-ab57-5526a6d59215`) and read the new logs. The stage logs will show exactly where it stops:
- stops after "ControlHub request started" → the outbound call is the problem (timeout/egress), and the new timeout will now surface it as a readable error;
- never logs "request received" → the failure is at the gateway/auth layer and we chase the session token instead.

### 5. Fix the confirmed cause
Apply the targeted fix once the logs name it (e.g. retry/backoff on the ControlHub call, correcting the ticket-id payload shape ControlHub expects, or refreshing the session before invoke).

## Technical notes

- Files touched: `supabase/functions/post-controlhub-comment/index.ts`, `src/components/admin/QATicketPanel.tsx`.
- No database or schema changes.
- No behavior change for successful comments — the outbound payload to ControlHub stays exactly as ControlHub specified.
