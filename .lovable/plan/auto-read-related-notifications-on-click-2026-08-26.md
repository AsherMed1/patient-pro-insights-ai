# Auto-read related notifications on click

Today, clicking a notification in the bell marks only that single row read. Threads like "Ticket 3050fc44… resolved / status changed / commented" pile up as 4+ separate unread items for the same patient record, so the badge stays high after you've read the update.

## Behavior change

Clicking a notification marks every other unread notification for the same record as read too:

- QA case notifications → all unread rows with the same `case_id`
- Patient record mentions → all unread rows with the same `appointment_id`
- Recapture notifications → all unread rows with the same `recapture_case_id`

The unread badge drops by the whole group, the list updates immediately (optimistic), and navigation/deep-link behavior is unchanged. The "All" tab still shows every notification individually.

## Technical notes

- `src/hooks/useQAMentions.tsx`: add `markGroupRead(mention)` — resolve the group key (`recapture_case_id` > `appointment_id` > `case_id`, falling back to the single id when none), optimistically flip `read_at` on all matching unread rows in local state, then a single Supabase update filtered by `mentioned_user_id = me`, the group column, and `read_at is null`.
- `src/components/notifications/MentionsBell.tsx`: `openMention` calls `markGroupRead(m)` instead of `markRead(m.id)`.
- No schema changes; `qa_note_mentions` has no ticket-id column, so grouping keys off the linked record rather than the ticket string in the title.
