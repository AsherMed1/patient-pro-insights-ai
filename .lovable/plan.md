# Introduce a "Setter" role

## Goal
Make the role that covers both Review Queue and Recapture read clearly as **Setter**, instead of "Review Queue Only".

## Approach
The existing `review_only` role already grants Review Queue + Recapture access — exactly what a Setter needs. Rather than creating a new database role (which means an enum change, new access rules, and re-assigning every current user), keep the underlying role and relabel it everywhere it is shown.

## What changes

1. **Role label**
   - "Review Queue Only" becomes **Setter** in all three role pickers (add user, edit user, inline role change) and in the role badge shown on the user list.
   - Helper text under the picker: "Setter — access to Review Queue and Recapture."

2. **Recapture-only role**
   - The separate `recapture` option stays, relabelled **Recapture Only**, for people who should work cancelled/no-show follow-up without the Review Queue.

3. **No access changes**
   - Setters keep exactly the access they have today: Review Queue plus the Recapture Worklist, scoped to their assigned clinics. Nothing else in the portal opens up.

## Technical notes
- Display-only change; the stored value stays `review_only`, so no migration and no policy edits.
- Files: `src/components/UserManagement.tsx` (three `SelectItem` labels at ~608, ~662, ~872, plus the badge label switch at ~520). Optional: a shared label map so future renames happen in one place.

## Validation
- Open User Management, confirm the dropdowns read "Setter" and "Recapture Only", an existing Review-Queue user's badge now reads "Setter", and that user still lands on the Review Queue + Recapture view.
