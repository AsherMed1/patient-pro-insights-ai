## Problem

QA Operations Queue shows zero `short_notice` cases even though `short_notice_alerts` has 746 rows. The DB trigger `qa_ingest_short_notice_trg` was added after the most recent alert, so nothing ever ingested. UI, constraint, and filter already support `short_notice`.

## Plan

### 1. Scoped backfill

Ingest only `short_notice_alerts` rows with `created_at >= 2026-07-22 11:59 America/New_York` (i.e. `>= '2026-07-22 15:59:00+00'`) into `qa_cases` by calling `public.qa_upsert_case(...)` per row with `alert_type = 'short_notice'`. Per the user, this should be roughly one record — Obery Hendricks.

Skip anything older; those stay out of the queue.

### 2. Verify trigger fires going forward

`qa_ingest_short_notice_trg` is already `ENABLED`, so any new `short_notice_alerts` insert will land in `qa_cases` automatically.

### 3. Separately investigate the 7-day gap in new alerts (report only)

Last `short_notice_alerts` insert was 2026-07-15 despite ~5–20/day historically. After the backfill I'll read recent Edge Function logs (`notify-slack-short-notice`, `update-appointment-fields`, `ghl-webhook-handler`) and report what I find before making any code changes.

### Technical notes

- Backfill is a single SQL `SELECT public.qa_upsert_case(...) FROM short_notice_alerts WHERE created_at >= '2026-07-22 15:59:00+00' AND appointment_id IS NOT NULL ORDER BY created_at ASC;` — dedup/activity logging handled by the existing function.
- No schema, RLS, or UI changes.
