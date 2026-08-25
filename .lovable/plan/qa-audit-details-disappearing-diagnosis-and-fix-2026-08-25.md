# QA Audit Details "disappearing" — diagnosis and fix

## What actually happened (verified in the database)

Nothing was erased. Shericka York has **three separate QA case rows** for the same appointment (`9c0bc6d0…`), one per alert type:

| Row | Alert type | Audit fields | Status |
|---|---|---|---|
| `ccd54f8b…` | Review Queue | Dean Lunderstedt · Tech Ticket · Workflow · Escalated to Tech · Caught before clinic | Completed |
| `86ebe61a…` | Short-Notice | Same audit values | Pending / Escalated |
| `83202ca5…` | Confirmed Audit | **all blank** | Completed |

The Confirmed Audit row was created at 13:36 UTC — the exact moment the Review Queue row was completed — because the appointment's status flipped to `confirmed` and the ingest trigger opened a *new* case for the `confirmed_audit` alert type. Audit fields live on each row individually, so the freshly created row opened with a clean slate. The screenshot matches this: the "Activity" block is the new row's short history, while all the earlier audit work appears under "History for this patient" tagged **Short-Notice**.

So: no automatic refresh, no other user overwrote anything, and no recovery is needed — the original audit details are intact on the two older rows.

**Scope:** 1,388 appointments have more than one QA case row; **213** of those have at least one audited row alongside at least one blank row. Those are all the same "looks wiped" situation.

## The fix: make the audit belong to the appointment, not the alert row

1. **Seed new sibling rows from the latest audited sibling.** When `qa_upsert_case` creates a case for an appointment that already has an audited sibling row, copy forward `qa_name`, `self_booked`, `error_category`, `error_source`, `caught_before_clinic`, `resolution_type` and log a `audit_inherited` activity entry ("Audit details carried over from the Short-Notice case") so the provenance is visible.

2. **Backfill the 213 affected rows** with the audit values from their newest audited sibling, each with the same `audit_inherited` activity entry, so Shericka York and every similar record immediately show their audit again.

3. **Show sibling audits in the drawer.** When the open case has no audit but a sibling for the same appointment does, render a small banner above Audit Details: "Audit already recorded on the Short-Notice case by Dean Lunderstedt — Aug 25, 8:04 AM" with a "Copy into this record" action. This makes the situation self-explanatory even if a future path creates a bare row.

4. **Keep audit changes attributable.** `audit_update` and `audit_cleared` activity rows already record actor and timestamp; extend `audit_update` metadata to record the before/after values of each changed field so any real future overwrite is fully traceable in the activity history.

## Technical notes

- `public.qa_upsert_case` — branch 3 (brand-new case insert): after inserting, `UPDATE` the new row from `(select … from qa_cases where appointment_id = _appointment_id and id <> new_id and (qa_name is not null or error_category is not null or resolution_type is not null) order by updated_at desc limit 1)`.
- Backfill runs as a one-off statement in the same migration, restricted to rows where all six audit fields are null and a sibling has values.
- `src/components/admin/QAOperationsQueue.tsx` — the case drawer: add a sibling-audit lookup keyed on `caseData.appointment_id`, the banner, and the copy action (writes through the existing `persist()` path so the normal `audit_update` activity is logged).
- No change to realtime, RLS, or the drawer's existing draft-protection logic.
