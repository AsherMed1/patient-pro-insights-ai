# Remove GHL link from QA Operations Queue patient column

## What the code shows (verified)
`src/components/admin/QAOperationsQueue.tsx` lines 1349–1363 render the patient name cell in the queue table. A GHL external-link icon (`<ExternalLink>`) is rendered next to the patient name via `ghlUrlFor(c)`. The user (red arrow in screenshot) wants this icon removed.

## Fix
Remove the `{ghlUrlFor(c) && (<a>...</a>)}` block (lines 1351–1362) from the patient name `TableCell` so only the patient name text remains.

This is a table-cell-only change. The `ghlUrlFor` helper and the **Open** button / drawer GHL link (lines 1464, 1685–1695, 2780–2782) are untouched — the drawer still offers the GHL link where it belongs.

## What to check after
Patient names in the QA Operations Queue table show no external-link icon; the GHL link inside the case drawer still works.
