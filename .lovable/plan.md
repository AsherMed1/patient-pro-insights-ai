
## Goal

In the QA Operations Queue, the "Entered" column should reflect **when the current alert was triggered**, not the original record creation time. Every new alert (initial, repeat on active case, or re-alert on completed case) must update the displayed alert time and re-sort the case to the top. The original creation time stays visible as a separate field.

## Changes

### 1. Database (migration)

- Add `qa_cases.first_entered_at timestamptz` — set once at case creation, never mutated afterward. Backfill from the earliest of (`created_at`, `entered_queue_at`, first `qa_case_activity.created_at`).
- Update `public.qa_upsert_case`:
  - **Path 1 (repeat alert on active case):** also set `entered_queue_at = now()` alongside `last_alert_activity_at = now()`, so the case bubbles to the top of New with the new alert time. `first_entered_at` is untouched.
  - **Path 2 (re-alert on completed case):** already resets `entered_queue_at`; leave `first_entered_at` untouched.
  - **Path 3 (brand new case):** `first_entered_at` defaults to `now()` (column default).

### 2. UI (`src/components/admin/QAOperationsQueue.tsx`)

- Rename table column header **Entered → Latest Alert**. Values continue to come from `entered_queue_at` (which now always reflects the newest alert).
- Add a new column **Date Created** rendering `first_entered_at`.
- Sort/order and date-range filter continue to use `entered_queue_at` (latest alert) — matches user intent to measure when each alert entered the queue.
- Case detail panel: show both "Date created" (`first_entered_at`) and "Latest alert" (`entered_queue_at`). Remove the current `last_alert_activity_at`-vs-`entered_queue_at` fallback logic since they now coincide.
- Update the `QACase` TS type to include `first_entered_at`.

## Technical notes

- `last_alert_activity_at` becomes redundant with `entered_queue_at` after this change but is kept to avoid touching other consumers/triggers; no code change needed there.
- Repeat-alert path currently only bumps `last_alert_activity_at`; bumping `entered_queue_at` too is the key behavior fix so the row re-sorts to the top on every alert.
- No changes to alert ingestion triggers (`qa_ingest_terminal_status`, `qa_ingest_confirmed_audit`, etc.) — they call `qa_upsert_case` which handles the timestamp logic centrally.
