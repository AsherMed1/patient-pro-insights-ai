---
name: QA Note Mentions
description: @mentions inside QA Operations case notes with an in-app Mentions bell, unread counts, and deep links to the exact note.
type: feature
---

Notes on a `qa_cases` record support `@` mentions of teammates with roles admin, agent, qa_specialist, or va.

- Mentions are stored inside the note text as `@[Full Name](user-uuid)` tokens (`src/lib/mentions.tsx`), rendered as highlighted chips.
- Composer: `src/components/admin/MentionTextarea.tsx` (type `@`, arrow keys / Enter / Tab to pick).
- `qa_note_mentions` table (note_id, case_id, mentioned_user_id, mentioned_by_user_id, mentioned_by_name, read_at). RLS: recipients and the author see their rows, admins see all; inserts require `has_qa_case_access`. Added to the realtime publication.
- Bell + Mentions panel: `src/components/notifications/MentionsBell.tsx` with `useQAMentions` hook (unread badge, mark read / mark all read, realtime).
- Deep link format: `/?tab=qa-queue&qaCase=<case id>&note=<note id>` — Index sets the tab, QAOperationsQueue opens the drawer and scrolls/highlights the note, then clears the params.
- Each mention also writes a `qa_case_activity` row of `activity_type = 'mention'`. Self-mentions are skipped.
