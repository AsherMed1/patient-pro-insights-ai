## Goal
When admin/agent users log in and reach the main admin dashboard (`/`), the **Projects** tab should be active by default instead of the **Dashboard** tab.

## Current State
- `src/pages/Index.tsx` initializes the tab state with `useState("dashboard")`.
- `src/hooks/useProjectRedirect.tsx` redirects `admin`/`agent` roles to `/` after login.
- Project users, review-only users, and QA specialists have separate stripped views and are unaffected.

## Proposed Change
1. In `src/pages/Index.tsx`, change the default `activeTab` state from `"dashboard"` to `"projects"`.

## Files to Modify
- `src/pages/Index.tsx` (line 35)

## Verification
- Log in as an admin/agent and confirm the **Projects** tab is selected by default.
- Confirm other tabs still work normally when clicked.
- Confirm project users, review-only users, and QA specialists are not impacted.