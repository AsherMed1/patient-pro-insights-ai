# Show auto-declined reviewer label for Review Queue rows cancelled in GHL

When the GHL webhook auto-declines a Review Queue row because it was cancelled in GoHighLevel, the row is stamped with `reviewed_by = null` (because that column is a UUID foreign key to a portal user). The Declined tab currently renders the timestamp line as `Declined Aug 17, 2026 3:10 PM by Unknown`, which makes it look like a human reviewer did something anonymous. We should surface it clearly as a system auto-decline.

## Behavior

- In the Declined tab, rows that were auto-declined via the `cancelled_in_ghl` reason should display:  
  `Auto-declined Aug 17, 2026 3:10 PM by GoHighLevel`  
  instead of `Declined ... by Unknown`.
- Normal manual declines continue to show:  
  `Declined Aug 17, 2026 3:10 PM by {Reviewer Name}`.
- Approved rows are unaffected.

## Technical notes

- Change is in `src/components/admin/ReviewQueue.tsx` around line 1967/2161 where `reviewerLabel` is computed and the `Declined`/`Approved` timestamp line is rendered.
- Detect the auto-decline case: `reviewed_by` is null/empty AND `decline_reason === 'cancelled_in_ghl'`.
- In that case:
  - Prefix word: `Auto-declined` instead of `Declined`.
  - Agent label: `GoHighLevel` instead of `Unknown`.
- No schema or backend changes; this is purely a UI label improvement for existing data.
- No new dependencies.
