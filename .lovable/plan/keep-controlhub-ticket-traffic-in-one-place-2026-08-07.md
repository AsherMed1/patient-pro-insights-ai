# Keep ControlHub ticket traffic in one place

Right now every Control Hub ticket event shows up twice in the QA drawer: once in the "ControlHub ticket" activity timeline, and again in the general "Activity" list at the bottom (status changes, comments, and mention entries sourced from the ticket).

## Change

Show ticket-sourced events only in the **ControlHub ticket** panel. The general **Activity** list will show portal-side work only (audit updates, assignments, escalations, workflow status changes, mentions made in the Portal).

Specifically, the Activity list will hide entries whose type is `ticket_update` / `ticket_resolved`, and mention entries whose metadata source is `controlhub`. Nothing is deleted — the rows stay in the database, so reporting and history are unchanged; they're just no longer duplicated in the drawer.

Kept as-is:
- ControlHub ticket panel keeps the full status/comment timeline and unread indicator.
- Notes section keeps `[Control Hub] @mention` notes, since that's where the tagged person replies.
- Notifications for ticket updates and mentions keep firing.

## Technical detail

- `src/components/admin/QAOperationsQueue.tsx`: filter the `activity` array before render — drop `activity_type in ('ticket_update','ticket_resolved')` and `activity_type === 'mention' && metadata.source === 'controlhub'`.
- No database or edge function changes; `controlhub-ticket-webhook` continues writing the same rows.
