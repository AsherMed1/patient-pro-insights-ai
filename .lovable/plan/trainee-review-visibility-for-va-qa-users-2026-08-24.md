# Trainee Review visibility for VA / QA users

Give VA and QA users read-only visibility of the Trainee Review bucket in the Review Queue, without granting any trainee-review decision powers.

## What changes

- The **Trainee Review** tab appears for `va` and `qa_specialist` users in addition to admin, agent, and trainer.
- For those users the tab is **view only**:
  - Rows, patient details, badges, and the "Returned to trainee" markers are all visible.
  - Approve, Decline, Return to trainee, Move stage, and bulk selection actions are hidden while the Trainee Review tab is active.
  - A short banner explains the record is waiting on trainee review and is not yet client-facing, so QA can answer clinic questions confidently.
- No other tab or permission changes: New, Pending Review, Declined, and Approved behave exactly as they do today for each role.

## Technical details

- `src/components/admin/ReviewQueue.tsx`
  - Split the current single `canReviewTrainees` flag into two: `canSeeTraineeQueue` (admin, agent, trainer, va, qa_specialist) controls tab rendering; `canActOnTrainees` (admin, agent, trainer) controls the action controls.
  - Gate the Trainee Review tab button on `canSeeTraineeQueue`.
  - When `isTraineeView && !canActOnTrainees`, treat the view like the existing read-only views: suppress row checkboxes, the bulk action bar, and the per-row Approve / Decline / Return buttons; render the read-only explanation banner instead.
- `src/pages/Index.tsx` — QA specialists currently do not reach the Review Queue at all (it is gated on management access or `va`). Add `qa_specialist` to that gate so the read-only bucket is actually reachable for the QA team.
- No database or RLS change is needed: `review_stage` is not part of any policy, so roles that already read pending Review Queue rows can read trainee-stage rows too.
