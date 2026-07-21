# Show names instead of emails on notes, comments & activity

Several code paths still stamp `user.email` (or the local-part of it) as the author on records that surface in the UI. Others already resolve `profiles.full_name` correctly. This plan fixes the remaining writers so **new** entries display the team member's name, and backfills **existing** rows that were stamped with an email.

## 1. Fix new writes to use `profiles.full_name`

Resolve the caller's `full_name` from `profiles` (falling back to `user.email` only when no profile name exists) in these code paths:

- **QA case notes** — `src/components/admin/QAOperationsQueue.tsx` (`author_name: user?.email` when inserting into `qa_case_notes`). Reuse the same `profiles.full_name` lookup already done for the QA Name / ticket "Submitted By" field in this file.
- **Support tickets** — `src/components/support-widget/tickets/TicketForm.tsx` (`created_by_name: user.email.split('@')[0]`).
- **Support chat (widget)** — `src/components/support-widget/chat/ChatView.tsx` (two spots setting `user_name: user?.email?.split('@')[0]`).

Where a component doesn't already have the profile in state, use the existing `useUserAttribution` hook, which already resolves `full_name` → `email` → `"Unknown User"`.

Not changed: fields that must remain an email (`author_email`, `created_by_email`, `submitted_by_email`, `sender_email`, `user_email`). Those are used for identity matching (e.g. TicketsView filters by `created_by_email`, ModernMessageBubble aligns bubbles by `sender_email`).

## 2. Confirmed already-correct surfaces (no change)

- Appointment notes — already prepend `by {userName}` via `useUserAttribution`, which prefers `full_name`.
- Admin Activity Log — `AdminActivityLog.tsx` already re-resolves the note author's `full_name` from `profiles` before display.
- Audit log dashboard — reads `user_name` written by DB triggers; the DB side already populates this from `profiles.full_name` for new rows.

## 3. Backfill historical rows

Run one migration that rewrites email-stamped identity fields to the matching `profiles.full_name` (only when a profile with that email exists — otherwise leave the value alone):

- `qa_case_notes.author_name`
- `support_tickets.created_by_name`
- `support_conversations.user_name`
- `support_messages.sender_name` (only when the row's `sender_email` matches a known profile)
- `audit_logs.user_name` (rows written before triggers were resolving names)
- `appointment_notes.note_text` — replace inline `by <email>` occurrences with `by <full_name>` for every known team email (case-insensitive, exact-email match to avoid partial rewrites).

The migration is idempotent: it only rewrites values that currently equal a known team email (or contain `by <known-email>` inside note text). Values that don't match any profile row are left untouched.

## 4. Verification

After the code change and backfill:
- Add a QA case note as Dean → author renders as "Dean Lunderstedt".
- Open an existing appointment's notes list → `by user@…` entries now read `by Dean Lunderstedt` (and equivalents for other teammates).
- Open Admin Activity Log for the same appointment → author column shows names.
- Support ticket list and support widget chat → "Created by" / participant name show full names.

## Technical details

- Frontend changes are localized to the four files listed in section 1; no shared types change.
- Backfill uses a single SQL migration with `UPDATE ... FROM public.profiles WHERE lower(target_field) = lower(profiles.email)` for direct-email columns and a `regexp_replace` join for `appointment_notes.note_text`. No schema changes, no new tables, no RLS changes.
- No edge-function changes: the writers that stamp identity live in the client.
