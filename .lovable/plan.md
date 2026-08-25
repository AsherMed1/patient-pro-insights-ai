# Fix Review Queue count mismatches (28 vs 11 vs 8)

## What the numbers actually are

Live database, `review_status = 'pending'`, excluding reserved blocks:

```text
new,           not superseded   8    <- what you can actually see and count
new,           superseded       3
pending_review                 10
qa_hold                         9    <- no tab shows these
```

Three different rules are being used, so three different numbers appear:

- **New tab badge (11)** — the count query forgets to exclude retired (superseded) rows, while the list correctly excludes them. 8 visible + 3 retired = 11.
- **Manual count (8)** — correct.
- **Red "28" on the Review Queue tab** — a separate query on the dashboard that counts every pending row in any stage (including the 3 retired rows and the 9 `qa_hold` rows that no tab displays), only excluding reserved blocks and three clinics.

## The fix

1. Make the tab count queries exclude retired rows exactly like the list does, so New shows 8 and each badge matches its own tab.
2. Make the red Review Queue tab badge equal the buckets a reviewer can act on: New + Pending Review (excluding retired rows, reserved blocks, and the same excluded clinics). With today's data that badge becomes 18 instead of 28.
3. Confirm what should happen to the 9 `qa_hold` rows — see the question below. They currently sit in `review_status = 'pending'` with a stage no tab renders, so they are invisible in the queue but inflate the red badge.

## Technical notes

- `src/components/admin/ReviewQueue.tsx` → `fetchCounts` `base()` helper: add `.or('is_superseded.is.null,is_superseded.eq.false')` (the list `fetch` at line 463 already has it). Best done by extracting a shared filter helper used by both `fetch` and `fetchCounts` so they cannot drift again.
- `src/pages/Index.tsx` → `fetchReviewCount`: add the superseded exclusion and restrict to `review_stage in ('new','pending_review')`, keeping the existing reserved-block and project exclusions.
- No database or RLS change required; this is purely query alignment.

## Open question

The 9 `qa_hold` rows have no tab in the Review Queue. Should they stay excluded from the badge (treated as parked elsewhere), or do they need their own visible bucket?
