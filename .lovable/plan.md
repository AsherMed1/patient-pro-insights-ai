# Control Hub @mentions → QA Operations notifications

Today the answer is **no**. The Control Hub webhook (`controlhub-ticket-webhook`) records each comment as ticket activity and flags the case unread, but it never looks at `@names` inside the comment text, so nobody gets a bell notification and no note is created on the QA record.

This plan closes that gap.

## What changes for users

- When someone writes `@Jane Doe` in a Control Hub ticket comment, Jane gets an in-app notification in the Mentions bell, exactly like a portal mention.
- Clicking it opens the linked QA Operations patient record and scrolls to the note.
- The comment is also written into the QA record's Notes as a note from the Control Hub author, so the conversation stays in one place.
- Only QA Team members can be tagged (roles: admin, agent, qa_specialist, va). An `@name` that doesn't match a QA Team member is ignored — no notification, comment still logged normally.

## How the tagging is matched

The webhook accepts either form from Control Hub:

1. Preferred — an explicit `mentions` array on the payload, e.g. `[{ "email": "jane@…" }]` or `[{ "name": "Jane Doe" }]`.
2. Fallback — plain `@Jane Doe` / `@jane@…` text scanned out of the comment body.

Both are resolved against the same QA-role user list used by the portal picker. Matching is case-insensitive on email first, then full name. Ambiguous or unknown names are skipped.

## Technical notes

- `supabase/functions/controlhub-ticket-webhook/index.ts`, after the existing `qa_ticket_events` insert and case update, for `comment` events with a body:
  - Resolve QA-role recipients from `user_roles` (admin/agent/qa_specialist/va) joined to `profiles` via the service-role client.
  - Insert one `qa_case_notes` row for the comment, prefixed with the Control Hub author name, with mention tokens rewritten to `@[Full Name](uuid)` so the portal renders them as chips.
  - Insert `qa_note_mentions` rows (note_id, case_id, mentioned_user_id, mentioned_by_name = Control Hub author, mentioned_by_user_id null) — deduped per user, unread by default.
  - Insert a `qa_case_activity` row of type `mention` per tagged user.
- No schema change needed: `qa_note_mentions` and the Mentions bell already handle everything downstream. `mentioned_by_user_id` must be nullable — verify and relax it in a migration if it is currently `NOT NULL`.
- Failures in the mention step must not fail the webhook; log and still return `ok`.
- Verification with a throwaway case: post a comment payload containing `@<a QA user>`, confirm a note appears on the case, a bell notification arrives for that user, and an unmatched `@name` produces no mention row. Clean up the test rows afterwards.
