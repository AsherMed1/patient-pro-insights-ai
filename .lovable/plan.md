# Recapture role: keep one role per user, make the labels honest

## Situation

The portal assigns exactly one role per user (the app reads a single role row), so the dropdown can only offer one choice. True multi-select would mean reworking how every screen decides what a user can see — a large change across the whole portal.

The good news: no merge is needed for your setters. "Review Queue Only" already grants Recapture access as well. The only thing missing is that the dropdown label doesn't say so, which is why it looks like a choice between the two.

## Proposed change (small, label + clarity only)

- Rename the dropdown option "Review Queue Only" to **"Review Queue + Recapture"**, with a short helper line: "Setters — access to both Review Queue and Recapture."
- Keep **"Recapture"** as-is, with helper text: "Recapture worklist only."
- Update the role badge shown in the user list so those two roles read the same way ("Review Queue + Recapture" / "Recapture").

Setters get assigned "Review Queue + Recapture" and can work both queues today; users who should only chase cancelled/no-show get "Recapture".

## If you truly want multi-select later

Full multi-role support means: the role hook returning a list instead of one role, every permission check and dashboard-routing branch updated to work off that list, the User Management dialogs saving multiple role rows, and access rules re-verified for each combination. That is a separate, larger piece of work — worth doing only if you need combinations beyond the setter case (for example a QA specialist who is also a setter).

## Technical notes

- `src/components/UserManagement.tsx`: update the three role `SelectItem` label sets and the badge label mapping (around lines 520, 608, 662, 872). No database change.
- No changes to `useRole.tsx`, `Index.tsx`, or RLS — `hasRecaptureAccess()` already includes `review_only`.
