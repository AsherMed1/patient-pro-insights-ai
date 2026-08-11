# Fix persistent “No Access” after login

## Confirmed cause

The Test User is valid: it has the `review_only` role and five project assignments. Login succeeds, but `useRole` reads `user_roles` and `project_user_access` directly. Those tables have RLS policies but no `authenticated` Data API grants, so the browser requests can be denied and the app incorrectly treats the user as role-less.

Secure database helper functions already exist and are executable by authenticated users:
- `get_user_role(user_id)`
- `user_accessible_project_names(user_id)`

## Implementation

1. Update `useRole` to retrieve the signed-in user’s role through `get_user_role` instead of reading `user_roles` directly.
2. Retrieve scoped project names through `user_accessible_project_names` instead of the direct `project_user_access` relationship query.
3. Preserve the existing retry/session-refresh behavior, but distinguish a real “no role assigned” result from a request error so transient failures never render the misleading No Access state.
4. Keep admin/agent/VA project loading unchanged because their active-project query is currently working.
5. Verify with the Test User flow that the Setter Worklist loads and that its five project assignments resolve without permission errors.

## Technical notes

This uses the existing `SECURITY DEFINER` functions, which scope results to the supplied signed-in user ID and avoid exposing the role/access tables directly. No database schema or permission expansion is required.
