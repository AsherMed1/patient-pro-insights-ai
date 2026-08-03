# Recapture Worklist UI Polish

## Goal
Tighten the Recapture Worklist table so the Lost Date stays on one line and the Actions column looks organized instead of scattered.

## Changes

### 1. Keep Lost Date on one line
In `src/components/recapture/RecaptureQueue.tsx`, update the Lost Date table cell to prevent wrapping.

```text
Current:  Jul
          27,
          2026
Target:   Jul 27, 2026  (single line)
```

- Add `whitespace-nowrap` to the Lost Date `<TableCell>`.
- Keep the existing `MMM d, yyyy` format.

### 2. Reorganize the Actions column
Replace the current stack of mixed-size buttons with a clean, compact action bar.

- Keep the two most-used actions as visible small buttons:
  - **Log Attempt**
  - **Complete**
- Move secondary actions into a single **Actions** dropdown menu:
  - Open record (was "Open")
  - Open in GHL (external link icon + label)
  - Claim / Reassign
  - Change Status
- Use consistent `size="sm"` styling and a tight horizontal flex row so the column no longer looks "all over the place."
- Use the existing shadcn `DropdownMenu` component (already available in the project) for the grouped actions.

## Verification
- Open the Recapture tab in the preview.
- Confirm every Lost Date value renders on a single line.
- Confirm the Actions column shows a tidy row: "Log Attempt", "Complete", and an "Actions" dropdown.
