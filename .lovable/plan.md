# Fix the Recapture Actions Column Completely

## What is happening
The Actions cell currently reserves `220px`, but **Log Attempt**, **Complete**, the More menu, gaps, and table-cell padding require more space. The screenshot confirms the table reaches the container edge before the complete Actions header and More control can render.

## Changes
1. Make the Actions header and cells a fixed-width sticky right column so they remain fully visible while the rest of the table scrolls horizontally.
2. Reserve enough width for all three controls, including gaps and cell padding, rather than relying on the current undersized `220px` minimum.
3. Give the sticky column the semantic table background and a subtle left divider so scrolling content does not show through it.
4. Keep **Log Attempt**, **Complete**, and More on one line without wrapping.

## File
- `src/components/recapture/RecaptureQueue.tsx`

## Validation
- Confirm the full **Actions** header is visible at the right edge.
- Confirm **Log Attempt**, **Complete**, and the More menu are all visible in every row.
- Confirm horizontal scrolling moves the data columns while Actions remains accessible and does not overlap or clip.
