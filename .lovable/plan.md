# Trainee Review access for Setter Team Leads

Ari and Isis are already admins, so they can already see and act on Trainee Review. The work is giving three specific Setters — Lucas, Nicolas, Katherine — full Trainee Review powers without opening the bucket to the other ~30 Setters.

## What changes

1. **New "Setter Team Lead" toggle**
   - In User Management, each user row / edit dialog gets a "Setter Team Lead" switch (only meaningful for Setter/review_only users, shown for them).
   - Only admins can set or clear it. The flag is stored per user, so future leads are a click away — no code change.
   - The user list shows a small "Team Lead" badge next to flagged Setters.

2. **Trainee Review access for flagged leads**
   - Flagged users see the **Trainee Review** tab in the Review Queue with **full review powers**: Approve, Decline, Return to trainee, Move stage, and bulk selection — same as trainers/admins.
   - Unflagged Setters see no change at all.
   - VA and QA users keep the read-only visibility they have today.

3. **Initial setup**
   - Turn the flag on for lucas.g@, nicolas.g@, and katherine.a@patientpromarketing.com.

## Technical details

- Migration: add `is_setter_team_lead boolean not null default false` to `public.profiles`; keep existing RLS (users read their own profile; admins manage all). Add an admin-only update path if the current profile policies don't already allow admin updates of this column.
- Data: `UPDATE public.profiles SET is_setter_team_lead = true` for the three emails.
- `src/hooks/useRole.tsx`: fetch the flag alongside the role, expose `isSetterTeamLead` and fold it into a new `canReviewTrainees()` helper (`admin | agent | trainer | setter team lead`).
- `src/components/admin/ReviewQueue.tsx`: extend `canSeeTraineeQueue` and `canActOnTrainees` (line ~141) to include setter team leads, so the tab renders and `traineeReadOnly` stays false for them.
- `src/pages/Index.tsx`: the Review Queue tab gate (lines ~320, ~382) already admits `review_only` users via the Setter layout — confirm flagged leads land on the Review Queue with the Trainee Review tab visible.
- `src/components/UserManagement.tsx`: read/write the flag (switch + badge), admin-only, with a toast and audit log entry on change.

## Validation

- Sign in as one of the three leads: Trainee Review tab appears with working Approve / Decline / Return.
- Another Setter: no Trainee Review tab.
- VA / QA: tab still visible, still read-only.
