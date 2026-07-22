## Goal
In the QA Operations Queue, a patient should visually display **only the most recent alert** on their row and record header. Prior alerts (e.g. Review Queue → Confirmed Audit) become history, not chips. Short-Notice is the one exception — it stays paired alongside the latest alert whenever an open short-notice case exists for that patient.

## Scope
`src/components/admin/QAOperationsQueue.tsx` only. No DB, RLS, or edge function changes. Sibling data is still loaded (needed for switching/history), just filtered from the chip display.

## Changes

### 1. Compute a `displayAlertTypes` per group
In `groupCases` (around line 189), replace the flat `alertTypes = unique(sorted.map(...))` with:
- `latest` = `sorted[0].alert_type` (already sorted by `last_alert_activity_at` desc)
- `hasOpenShortNotice` = any child where `alert_type === 'short_notice'` AND `workflow_status !== 'completed'`
- `displayAlertTypes` =
  - `[latest]` if latest is `short_notice` or no open short-notice sibling exists
  - `['short_notice', latest]` otherwise (short-notice pinned first)

Rename the group field from `alertTypes` → `displayAlertTypes` and update the two consumers (lines 554, 557).

### 2. Update the Alerts column overflow badge
Line 557's `+N` overflow badge currently counts `children.length - alertTypes.length`. Replace with count of *hidden* alert types: `children.length - displayAlertTypes.length` — remains accurate and now correctly reflects "N older alerts hidden".

### 3. Update the drawer sibling chip strip (lines 868–892)
Match the same rule for the header chip row:
- Always show the currently-open case's chip
- Additionally show a chip for an open short-notice sibling (if the open case isn't already short-notice)
- Do NOT render other sibling chips as top-level chips

Move the remaining siblings into a new collapsible **"Previous alerts"** subsection inside the existing Activity/History area — render as clickable rows (same `onSwitchCase` behavior) showing alert label, workflow status, and `last_alert_activity_at`. This preserves the ability to switch cases without cluttering the header.

### 4. No changes to
- Bucket counts (each case still counts in its own bucket by workflow_status)
- Filters, search, or realtime subscriptions
- Data model or triggers

## Behavior after change
- Kelly K Vega row: shows only **Short-Notice** + **Confirmed Audit** (latest non-SN), Review Queue moves to history
- A patient with Review Queue → Confirmed Audit (no short notice): shows only **Confirmed Audit**; Review Queue appears under Previous alerts
- A patient with only Review Queue open: shows **Review Queue**
- Short-Notice pairing persists until that short-notice case is marked completed
