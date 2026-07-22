## Problem

Tom Murray's appointment stored correctly in DB as `2026-08-08 15:00 UTC` = **Aug 8, 10:00 AM CT** (NG Vascular timezone `America/Chicago`).

- Portal renders it correctly using the project timezone → "Aug 08, 2026 10:00 AM"
- QA Operations drawer renders `new Date(appointment_date)` with `date-fns` `format()`, which uses the **viewer's browser timezone**. For a viewer in Asia/Manila (UTC+8), 15:00 UTC shows as **11:00 PM**.

## Fix

Render `appointment_date` in the QA drawer using the project's timezone (same source of truth as Portal), not the browser's.

### Changes in `src/components/admin/QAOperationsQueue.tsx`

1. Use `formatInTimeZone` from `date-fns-tz` for the appointment date display (line 974) and the ticket description prefill (line 817).
2. Resolve the project's timezone via the existing `fetchProjectTimezone` / `getCachedProjectTimezone` helper in `src/utils/projectTimezoneCache.ts`, keyed on `caseData.project_name`. Fall back to `America/Chicago`.
3. Warm the cache when cases load (batch `fetchProjectTimezone` for the visible project names) so the drawer renders synchronously.
4. Leave workflow timestamps (Date created, Latest alert, Date resolved) as-is — those are event timestamps, correctly shown in the viewer's local time.

No trigger or DB changes — the stored value is already correct. This is a display-layer fix only.

## Verification

- Reopen Tom Murray in QA drawer → "Appt date" reads **Aug 8, 2026 10:00 AM** (matches Portal and GHL).
- Spot-check a Buffalo (`America/New_York`) case to confirm timezone lookup works per-project.
