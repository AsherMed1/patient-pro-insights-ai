# @Mentions and In-App Notifications for QA Notes

Let QA team members tag teammates inside a QA Operations record's Notes, and give the tagged person an in-app notification that opens that exact record and note.

## What the user sees

**Writing a note**
- Typing `@` in the QA note box opens a searchable teammate picker (name + email).
- Selecting a person inserts `@Full Name` as a highlighted chip-style token in the saved note.
- Multiple mentions per note are supported. Author name and timestamp are already recorded and stay as-is.

**Notification center**
- A bell icon in the top navigation with an unread count badge.
- Clicking it opens a "Mentions" panel: who mentioned you, the patient name, clinic, alert type, note excerpt, and relative time.
- Clicking an item opens QA Operations with that case's drawer open, scrolls to the Notes section, and briefly highlights the mentioned note.
- "Mark as read" per item and "Mark all as read". Read items remain viewable under an "All" tab.
- Unread count updates live (realtime), no refresh needed.

**Inside the QA record**
- Mentions render highlighted in the note list, so the full patient-specific discussion stays in one place.
- If the mentioned person is not the assignee, the note also appears in the case Activity timeline as "Mentioned <name>".

## Who can be mentioned

Anyone with an active portal account who has access to QA Operations (admin, agent, qa_specialist, va). The picker filters as you type; users without access to the case's clinic are still mentionable but flagged so nobody expects them to open a record they cannot see.

## Data model

New table `qa_note_mentions`:
- `id`, `note_id` (FK to `qa_case_notes`), `case_id`, `mentioned_user_id`, `mentioned_by_user_id`, `mentioned_by_name`, `created_at`
- `read_at` (null = unread)

RLS: a user can select/update only rows where `mentioned_user_id = auth.uid()`; admins can select all. Insert allowed for authenticated users who can access the case (reuses `has_qa_case_access`). Grants for `authenticated` + `service_role`. Table added to the realtime publication so the badge updates live.

Notes text stores mentions as `@[Full Name](user-uuid)` so rendering stays stable if a display name changes; the picker writes both forms.

## Technical notes

- `src/components/admin/QAOperationsQueue.tsx`
  - `addNote`: parse mention tokens, insert the note, then insert `qa_note_mentions` rows for each unique mentioned user (skip self), plus a `qa_case_activity` row of type `mention`.
  - New `MentionTextarea` component (textarea + `@` trigger popover using the existing `Command` primitives, modeled on `src/components/chat/PatientSearchCombobox.tsx`).
  - Note rendering: new `renderNoteWithMentions` helper wrapping the existing `renderWithLinks` so URLs still linkify.
  - Accept a `focusCaseId` / `focusNoteId` prop (from URL params `?qaCase=<id>&note=<id>`), auto-open that case drawer, scroll and highlight.
- New `src/hooks/useQAMentions.tsx`: fetches unread + recent mentions for the current user, realtime subscription with proper `removeChannel` cleanup, `markRead` / `markAllRead`.
- New `src/components/notifications/MentionsBell.tsx`: bell + badge + popover list; navigates to `/?tab=qa&qaCase=…&note=…`.
- Mount the bell in the shared header of `src/pages/Index.tsx` (visible to roles with QA access, including the stripped `qa_specialist` layout).
- Mentionable-user list comes from `profiles` joined with `user_roles`, fetched once per session and cached.

## Out of scope

No email or Slack fan-out — notifications are in-app only. Mentions are limited to QA Operations notes for now (not appointment notes), and can be extended later.
