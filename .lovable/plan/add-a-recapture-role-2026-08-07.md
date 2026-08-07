# Add a "Recapture" role

## Goal
Give User Management a new role option, **Recapture**, for setters who should work cancelled and no-show appointments but not the Review Queue. The existing **Review Queue Only** role keeps both Review Queue and Recapture, unchanged.

## What changes

1. **New role value**
   - Add `recapture` to the app role list in the database.

2. **Access rules**
   - Recapture-role users can view and update recapture cases and log outreach attempts, scoped to the projects assigned to them (same project scoping the setter role already uses).
   - They can read the appointment records those recapture cases point to, plus read/add appointment notes, so outreach context and logging work.
   - They get no Review Queue access, no approve/decline rights, no admin surfaces.

3. **User Management dropdown**
   - Add "Recapture" to the three role selects (add user, edit user, inline role change) and to the role badge/label mapping.

4. **Portal layout**
   - Recapture-role users land on a stripped page like the setter view, but with just the Recapture Worklist (no Review Queue tab, no pending-review count fetch).
   - Recapture components treat this role the same as a setter for project filtering and permitted actions.

## Technical notes
- Migration: `ALTER TYPE public.app_role ADD VALUE 'recapture'` (separate migration step from any policy referencing it, since new enum values cannot be used in the same transaction).
- Policies to extend with the new role: `recapture_cases_setter_select`, `recapture_cases_setter_update`, `recapture_attempts` insert/select, `all_appointments` review-only select, `appointment_notes` select/insert. Keep the `project_user_access` join condition.
- Update `public.has_recapture_case_access` to include `recapture` alongside `review_only`.
- Frontend: `src/hooks/useRole.tsx` (`UserRole` type, `isRecaptureRole`, include in `hasRecaptureAccess`), `src/components/UserManagement.tsx` (3 selects + label switch at ~line 520), `src/pages/Index.tsx` (new stripped branch before the review-only branch; exclude from the review-count effect), `src/components/recapture/RecaptureQueue.tsx` and `RecaptureReports.tsx` (`isSetter` should also be true for `recapture`).

## Validation
- Assign the role to a test user, confirm they see only the Recapture Worklist for their assigned projects, can log an attempt and complete a case, and cannot reach the Review Queue.
