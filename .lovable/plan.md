## Diagnosis (verified)

Nothing is being hidden or deleted. Paula Cummings' case still exists in the database:

- Case `7ee1f704…`, Ozark Regional Vein and Artery Center, alert `confirmed_audit`, `workflow_status = pending_escalated`, entered queue **Jul 22, 2026 16:09 UTC**. It is her only row (no siblings, no completion, no resolution).

The reason she disappeared from the UI: `QAOperationsQueue.tsx` fetches cases with `.order('entered_queue_at', desc).limit(500)`. There are now **735 active-type cases newer than her entry** (433 confirmed_audit + 210 review_queue + 74 oon + 18 short_notice), so her row falls outside the 500-row window and never reaches the client. Every bucket count, filter, and search runs on that truncated set, so older open cases silently vanish as volume grows — this affects all long-lived Pending/Escalated and In Review items, not just Paula.

## Fix

1. **Remove the hard 500 cap in `fetchCases`** — replace the single query with a paged fetch loop (`.range()` in pages of 1000) that keeps pulling until fewer rows than a page return, so the full active set is loaded.
2. **Bound the volume sensibly so the page stays fast:** always load *all* non-completed cases (`workflow_status != 'completed'`) regardless of age, and cap only `completed` cases to a recent window (e.g. last 90 days) unless the user sets a date filter or switches to the Completed/All tab. Open work can never be truncated again.
3. **Keep the existing appointment-contact enrichment step** working over the larger result set (it already chunks by 500 ids).
4. **Add a subtle "showing N of M" indicator** near the bucket tabs when any cap is applied, so a truncated view is visible rather than silent.

## Technical notes

- Only `src/components/admin/QAOperationsQueue.tsx` changes; grouping, filtering, and bucket-count logic stay as-is and simply operate on the complete set.
- No database or trigger changes needed — the data was always intact.
- After the change, Paula Cummings will reappear under **Pending / Escalated**.
