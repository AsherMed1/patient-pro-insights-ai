## Goal
After login, admins/agents should land on the **Projects** tab, not Dashboard.

## Why it didn't take
`src/pages/Index.tsx` line 35 still reads `useState("dashboard")` — the earlier change is not present in the current code, so the app still defaults to Dashboard on every load.

## Change
In `src/pages/Index.tsx`:
- Initialize `activeTab` to `"projects"` instead of `"dashboard"`.
- The Projects tab is rendered unconditionally in the tab list, so every user who reaches this page can see it; role-specific redirects (project users, review-only) run before and are unaffected.

No other files change; the Dashboard tab remains available and clickable.
