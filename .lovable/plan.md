# Tab-Aware Excel Export

## Problem
The user (sachin.yadav, AVA Vascular) wants to export only **Needs Review** cases to Excel. Today the "Export to Excel" button in `AllAppointmentsManager.tsx` honors project, date, search, status, procedure, location, and service filters — but it ignores the **active tab** (New / Needs Review / Upcoming / Completed / All). So clicking Export from the Needs Review tab dumps every appointment, not just Needs Review.

Yes, this is fully possible — it's a small, contained change.

## Fix
Apply the same tab-based filter conditions used by the on-screen list query (lines 303–344) to the export query as well. The export will then mirror exactly what the user sees in the current tab.

Specifically, when building the export query in the button handler (around line 1414), branch on `activeTab` and add:

- **new** — `internal_process_complete` is null/false, status not Pending/Do Not Call, not superseded
- **needs-review** — Pending status OR null/past `date_of_appointment`, excluding terminal statuses (Cancelled, No Show, Showed, Won, OON, Do Not Call, Rescheduled), not superseded
- **future** — `internal_process_complete = true`, future date, no terminal statuses
- **past** — only terminal statuses
- **all** — no extra tab filter (current behavior)

This reuses the exact same predicates already proven correct for the list view, so Needs Review export = Needs Review tab contents (subject to any other filters the user has set).

## UX touch
Update the toast and button label to reflect the scoped export, e.g.:
- Button: keep "Export to Excel"
- Toast title on click: "Exporting {tabLabel} appointments…"
- Success toast: "{n} {tabLabel} appointments exported."

Where `tabLabel` is "Needs Review", "New", "Upcoming", "Completed", or "All".

## Files Touched
- `src/components/AllAppointmentsManager.tsx` — extend the export button's `onClick` handler (lines ~1410–1453) to apply `activeTab` filters to the Supabase query before fetching.

No DB migration, no new component, no edge function. Single-file change.

## Out of Scope
- Per-tab column customization (export columns stay as defined in `exportAppointmentsToExcel.ts`).
- A separate "Export Needs Review" button — the existing button becomes context-aware instead.
