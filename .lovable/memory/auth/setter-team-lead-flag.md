---
name: Setter Team Lead flag
description: profiles.is_setter_team_lead grants Setter (review_only) users full Trainee Review powers; toggled in User Management by admins.
type: feature
---
`public.profiles.is_setter_team_lead` (boolean, default false) marks Setter Team Leads.

- `useRole()` exposes `setterTeamLead`, `isSetterTeamLead()`, and `canReviewTrainees()` (= admin | agent | trainer | setter team lead).
- `ReviewQueue.tsx` uses `canReviewTrainees()` for both `canSeeTraineeQueue` and `canActOnTrainees`, so flagged Setters get full Approve / Decline / Return to trainee powers.
- VA and QA specialists keep read-only Trainee Review visibility; unflagged Setters see no Trainee Review tab.
- Admins toggle the flag in User Management (edit dialog, shown only for the Setter role); flagged users show a "Team Lead" badge.
- Initially enabled for lucas.g@, Nicolas.g@, katherine.a@patientpromarketing.com.
