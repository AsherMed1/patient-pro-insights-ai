# Fix: Audit Details cleared when the QA Operations Queue refreshes

## What's happening

The QA Operations Queue subscribes to realtime changes on `qa_cases`. Any new alert (or any row change anywhere in the queue) re-fetches the whole list, which replaces the open drawer's case object with a brand-new object — even when nothing about that case changed.

The drawer's form-initialization effect is keyed on that whole object, so it re-runs on every refresh and overwrites the form fields (QA Name, Self-Booked, Error Category, Error Source, Caught Before Clinic, Resolution) with the values saved in the database, wiping anything typed but not yet saved.

## The fix

1. **Stop re-initializing the form on refresh.** Initialize the Audit Details form only when the drawer opens on a *different* case (key on the case id, not the object). A background refresh of the same case no longer touches the form. Notes/activity keep refreshing as they do today.

2. **Protect in-progress edits.** Track whether the form has unsaved changes (compared against the saved case values). While the drawer is open and dirty:
   - Incoming realtime refreshes still update the list behind the drawer, but never the form.
   - If the underlying case was changed by someone else while you were editing, show a small inline notice above the form ("This record was updated elsewhere — your entries are preserved") with a "Load latest" link that overwrites the form on demand.
   - Closing the drawer with unsaved changes asks for confirmation before discarding.

3. **Draft safety net.** Persist the in-progress Audit Details to browser local storage per case id, restored if the drawer is reopened or the tab is reloaded, and cleared once the audit is saved or cleared.

## Technical notes

- File: `src/components/admin/QAOperationsQueue.tsx` (drawer component holding `audit` state).
- Change the effect dependency from `[caseData, user?.email]` to `[caseData?.id, user?.email]`, and split the QA-name/profile lookup out so it doesn't re-seed the form.
- Add a `savedSnapshotRef` of the last saved audit values for the dirty check and for the "updated elsewhere" comparison.
- Local-storage key: `qa-audit-draft:<case_id>`; cleared on save/clear-audit.
- No database, edge function, or realtime-subscription changes — the queue keeps refreshing in real time.
