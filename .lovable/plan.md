# Fix raw mention tokens appearing in ControlHub ticket comments

When a QA tags someone, ControlHub shows the raw internal token, e.g.
`@[Dean Lunderstedt](608c4c6d-...) Second Test` instead of `@Dean Lunderstedt Second Test`.

Cause: the QA composer stores mentions as `@[Name](uuid)` tokens (that's how the portal
renders mention chips), and `post-controlhub-comment` forwards that exact string to
ControlHub, which has no idea how to render it.

## What changes

- Before sending to ControlHub, convert mention tokens to plain `@Full Name` text.
  ControlHub then shows `@Dean Lunderstedt Second Test` and its own mention matching
  (by name) keeps working.
- The comment recorded in the portal's ticket timeline keeps the token form, so the
  portal still renders the highlighted mention chip and bell notifications are unaffected.
- Already-posted comments in ControlHub are not rewritten (they stay as-is).

## Technical notes

`supabase/functions/post-controlhub-comment/index.ts`
- Add a small local `stripMentionTokens` helper (same regex as `src/lib/mentions.tsx`:
  `/@\[([^\]]+)\]\(([0-9a-fA-F-]{36})\)/g` → `@$1`).
- Apply it to build `outboundBody` used in the ControlHub POST `body` field and in the
  `controlhub_ticket_last_activity` summary.
- Keep the original `bodyText` for the `qa_ticket_events` insert (token form) and for the
  mention-notification payload.
- Redeploy the function.

No frontend or schema changes.
