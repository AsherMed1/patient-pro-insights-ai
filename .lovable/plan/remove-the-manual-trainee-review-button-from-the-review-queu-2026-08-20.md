# Remove the manual "Trainee Review" button from the Review Queue

## Goal
Remove the per-row **Trainee Review** button (the manual "reclassify as Trainee Submitted" action) from `src/components/admin/ReviewQueue.tsx`. The Trainee Review *bucket/tab* itself stays — trainee-routed records still arrive there automatically via the GHL webhook. Only the manual reclassification button is removed.

## Changes (single file: `src/components/admin/ReviewQueue.tsx`)
1. **Delete the button block** (lines ~2615–2626): the `{!isTraineeView && (<Button ...>Trainee Review</Button>)}` JSX.
2. **Delete the `handleMoveToTrainee` function** (~lines 1698–1727) since it is no longer referenced anywhere. Confirm no other call sites via `rg handleMoveToTrainee`.
3. **Remove the now-unused `GraduationCap` import** if it is no longer used elsewhere in the file (check `rg GraduationCap`).
4. Leave the Trainee Review *view/tab*, the "Return to trainee" action, and all webhook-driven trainee routing untouched.

## Non-goals
- No changes to `ghl-webhook-handler`, the `review_stage` schema, or the Trainee Review tab/counter.
- No changes to "Return to trainee" or trainee tagging logic.

## Verification
- `rg "handleMoveToTrainee|Trainee Review"` in `ReviewQueue.tsx` shows no orphaned references after edits.
- Build/typecheck passes (harness runs automatically).
