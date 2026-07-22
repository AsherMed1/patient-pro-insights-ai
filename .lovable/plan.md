## Goal

Consolidate the drawer so previous sibling alerts (e.g. "Confirmed Audit · completed") no longer sit in their own "Previous alerts" block — instead they appear as entries in the **Activity** timeline, keeping everything in one spot.

## Changes (single file: `src/components/admin/QAOperationsQueue.tsx`)

### 1. `CaseDrawer` header block (lines ~920–978)
- Keep the "Current alert for this patient" row (current alert chip + pinned active Short-Notice chip when applicable).
- **Remove** the "Previous alerts (N) — click to switch" list entirely. Its function moves into Activity.

### 2. Activity section (lines ~1202–1251)
- Build a merged, chronologically sorted list combining:
  - existing `activity` rows (unchanged rendering), and
  - one synthesized entry per sibling in `previousAlerts` (siblings excluding the pinned active Short-Notice), using `last_alert_activity_at || entered_queue_at` as the timestamp.
- Sibling entries render as:
  - Left: `<Badge variant="outline">{ALERT_LABELS[alert_type]}</Badge>` + workflow status text, wrapped in a button that calls `onSwitchCase(sibling)` and shows a hover state (`hover:bg-accent`, rounded, small padding) to signal it's clickable.
  - Right: same `MMM d, h:mm a` timestamp style as other activity rows.
- Preserve existing sort (ascending by created_at); synthesized entries slot in by their timestamp.
- Empty-state text updates to only show when both activity and siblings are empty.

### 3. No changes to
- Data fetching, realtime, sibling grouping (`groupCases`), or `onSwitchCase` behavior.
- The top "Current alert" chip row (still shows current + pinned short-notice).

## Result
The drawer shows one unified timeline. In the Dalkiris B Gil example, "Confirmed Audit · completed · Jul 21, 2:46 PM" appears as a clickable row inside **Activity** alongside "Status changed to OON" and "Status changed to in review" — no separate Previous alerts block.
