# Pending Review Safeguards + Short Notice Countdown

Goal: stop Pending Review records from quietly aging, and keep Short Notice appointments out of the Pending workflow.

## 1. Short Notice cannot enter Pending

- A record is "Short Notice" when it has an open (unresolved) short-notice alert, or when the business hours from now to the appointment slot are at or below the clinic's configured Short Notice threshold.
- In the Review Queue, the **Move to Pending Review** action (row-level and bulk) is disabled for those records, with a tooltip: "Short Notice — must be actioned now, not moved to Pending."
- Bulk moves silently skip short-notice rows and report how many were skipped.

## 2. Short Notice countdown inside Pending

- Each Pending row shows time remaining until the appointment crosses the clinic threshold, calculated with the same business-hours logic already used when alerts fire, using each clinic's timezone and `short_notice_threshold_hours`.
- Format: `Short Notice in 1d 6h`. Under 8 hours it turns amber; once crossed it turns red and reads `Short Notice — action now`.
- Countdown recalculates on a one-minute tick in the browser, so it stays live without reloading.
- Rows are sorted so the closest to (or already past) the threshold sit at the top of Pending.

## 3. Automatic Short Notice tagging

- A scheduled backend sweep runs every 15 minutes over all Pending Review records with a future appointment date and a non-terminal status.
- When a record crosses its clinic's threshold, the sweep creates the Short Notice alert exactly as the booking-time path does today (including the Slack notification) and records that the tagging was automatic.
- The record stays in Pending but is flagged red and pinned to the top; the Move to Pending action becomes unavailable and the row is marked as requiring immediate action.
- The sweep is idempotent: one open alert per appointment, never re-fires.

## 4. Pending queue safeguards

Each Pending row gains a compact status strip:

- **Moved to Pending** — date/time the record entered Pending, plus who moved it.
- **Pending Age** — e.g. `3d 4h in Pending`.
- **Last contact attempt** — derived from the most recent user-authored internal note on the appointment (system/automated notes excluded), showing the note author's name and how long ago.
- **Aging warning** — if no user note has been added within 24 business hours of entering Pending (or of the last note), the row shows an amber "Needs another contact attempt" chip. A filter toggle lets setters view only those rows.

## 5. Audit trail

Every Pending-related event is written to the existing appointment review history: moved into Pending, moved back to New, automatic Short Notice tagging, and status changes. The row detail view shows this history in chronological order so any shift can see what has already been tried.

## Technical notes

- New columns on `all_appointments`: `pending_since` (timestamptz), `pending_by` (uuid), `pending_by_name` (text), `short_notice_auto_tagged_at` (timestamptz). Backfilled for existing Pending rows from the latest `appointment_review_history` entry, falling back to `created_at`.
- New shared helper `src/lib/shortNotice.ts` holding the business-hours calculation and countdown formatting, mirroring `calculateBusinessHours` / `localDatetimeToUTC` in `ghl-webhook-handler` so portal and backend agree.
- New edge function `sweep-short-notice-pending`, scheduled with pg_cron + pg_net every 15 minutes; it reuses `notify-slack-short-notice` for alert creation and Slack delivery, and writes an `appointment_review_history` row with action `short_notice_auto_tagged`.
- `ReviewQueue.tsx`: `handleMoveStage` gains a short-notice guard; the Pending list fetches per-project thresholds/timezones once, batch-fetches the latest non-system `appointment_notes` per row, and renders the countdown, pending age, last-contact and aging chips.
- Existing short-notice alert fetch is reused for the "already tagged" state; no change to booking-time alerting.
