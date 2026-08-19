# User stamp on QA Activity entries

Show who performed each Activity entry in the QA Operations case drawer, e.g.
"Status changed to Opened by Jenny — Aug 18, 1:56 PM".

## What changes

- Every activity line that has a known actor gets a "by {Name}" suffix (rendered as
  muted text after the description).
- System-generated entries with no actor (e.g. "Confirmed appointment queued for QA audit",
  auto re-alerts, ticket sync) show "by System" so the timeline never looks blank or
  falsely attributed.
- The sibling/cross-alert activity list in the same drawer gets the same treatment.
- Entries whose description already ends in "by X" (note edited/deleted, escalations)
  are not double-stamped.

## How it works

- Activity rows already store `actor_user_id` for user-driven types
  (status_change 6549/6730, audit_update, assignment, escalation, mention, note edits).
  Automated rows (`created`, `realerted`, `alert_repeat`, ticket_*) have no actor — those
  render as "System".
- Names come from the existing `useMentionableUsers` hook, which calls the
  security-definer `get_mentionable_users` RPC, so QA specialists and VAs can resolve
  teammate names without direct `profiles` read access. Fall back to
  `metadata.actor_name` when present, then "System".
- No database changes and no new queries; this is display-only in
  `src/components/admin/QAOperationsQueue.tsx`.

## Technical notes

- Add `actor_user_id` to the `QAActivity` interface (already selected via `select('*')`).
- Build a `Map<userId, name>` from `useMentionableUsers()` inside the case drawer and a
  small `activityActorLabel(a)` helper used by both the main Activity list and the
  sibling activity list.
- Keep the existing `meta.actor_name` line for review-queue transitions from duplicating
  the new suffix.
