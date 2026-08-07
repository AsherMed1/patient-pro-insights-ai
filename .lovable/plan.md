# Setter role: Review Queue + Recapture

## Status
This is already live in the portal, exactly as shown in your screenshot.

- The role dropdowns (add user, edit user, inline change) and the "All Roles" filter list **Setter** and **Recapture Only**.
- The role badge on the user list shows **Setter**.
- A Setter signs in to a stripped portal with two tabs: **Review Queue** and **Recapture** — nothing else.
- **Recapture Only** users get the Recapture Worklist alone, no Review Queue.
- Both are scoped to the clinics assigned to that user.

## Proposed action
No code changes needed. If you want, I can do a quick verification pass instead:

1. Assign the Setter role to a test user in User Management.
2. Confirm the badge reads "Setter" and both tabs load with only their assigned clinics.
3. Confirm no admin surfaces (Appointments, QA Operations, Projects) are reachable for that user.

## Technical notes
- Stored role value stays `review_only`; "Setter" is the display label only, so existing users keep their access with no migration.
- `recapture` remains a separate enum value for Recapture Only.
