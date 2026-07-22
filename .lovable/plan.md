## Goal
Give users with the `va` role access to the QA Operations tab and its underlying data (Gloria Govender reports she can't see it).

## Changes

### 1. Frontend gating — `src/pages/Index.tsx`
Two spots currently gate QA Operations behind `hasManagementAccess()` only:
- Line 349–351: `<TabsTrigger value="qa-queue">`
- Line 403–407: `<TabsContent value="qa-queue">`

Change both conditions to `(hasManagementAccess() || role === 'va')`, matching the pattern already used for the Review Queue tab.

### 2. Database RLS — new migration
`qa_cases` currently allows full access only to `admin` / `agent` (`qa_cases_admin_full`) plus scoped `qa_specialist` reads. VA users would see an empty grid even with the tab exposed. Add:

- New policy `qa_cases_va_full` on `public.qa_cases` for role `va` (SELECT/INSERT/UPDATE/DELETE — VA already edits notes, statuses, tickets in this module, matching admin/agent behavior).
- Update `public.has_qa_case_access(_case_id uuid)` to also return true when `has_role(auth.uid(), 'va')`, so VA users can read/write `qa_case_notes` and `qa_case_activity`.

Grants on these tables already cover `authenticated`, so no GRANT changes needed.

## Out of scope
- No change to QAOperationsQueue component internals (no role checks there).
- No change to Review Queue, ControlHub ticket routing, or other modules.
