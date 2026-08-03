# Remove Recapture Worklist Header Reload Icon

## What we’re changing
The Recapture Worklist header currently shows a circular reload icon (`RotateCcw`) to the left of the title. Remove that icon while keeping the title and layout intact.

## Changes
1. In `src/components/recapture/RecaptureQueue.tsx`:
   - Remove the `<RotateCcw className="h-5 w-5 text-primary" />` element from the header (around line 470).
   - Remove `RotateCcw` from the `lucide-react` import if it is no longer used elsewhere in the file.

## Validation
- Open the Recapture tab in the preview.
- Confirm the header reads "Recapture Worklist" with no icon to its left.
- Confirm the Queue / Reports toggle buttons remain in their current position on the right.
