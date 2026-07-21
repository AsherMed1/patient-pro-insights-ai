## Change
In the QA case detail drawer, when a user opens a case that is currently `new`, the Workflow Status dropdown should display **In Review** immediately — matching the automatic status transition that already happens on open.

## Where
`src/components/admin/QAOperationsQueue.tsx` — the drawer's Workflow Status `<Select>` value binding.

## How
- `openCase()` already flips the DB status from `new` → `in_review` and stamps `review_started_at`. The dropdown currently reflects the local `selectedCase.status`, which can briefly show "New" until state refreshes.
- Update the Select's `value` prop so that when the drawer is opened on a `new` case, it renders `in_review` optimistically (either by updating `selectedCase.status` locally the moment `openCase` is called, or by coercing the Select's displayed value from `new` → `in_review` while the drawer is open).
- No changes to counts, filters, activity log, or the automatic transition logic — those already work. This is purely a display fix so the dropdown matches the real post-open state.

## Out of scope
- No DB/migration changes.
- No change to how re-alerted cases bubble back to New in the list view.