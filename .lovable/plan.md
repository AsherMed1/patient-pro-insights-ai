# Fix Review Queue count mismatches (28 vs 11 vs 8) and surface the hidden QA Hold rows

## What the numbers actually are

Live database, `review_status = 'pending'`, excluding reserved blocks:

```text
new,           not superseded   8    <- what you can actually see and count
new,           superseded       3
pending_review                 10
qa_hold                         9    <- invisible: no tab renders this stage
```

Three different rules produce three different numbers:

- **New tab badge (11)** — the count query forgets to exclude retired (superseded) rows, while the list correctly excludes them. 8 visible + 3 retired = 11.
- **Manual count (8)** — correct.
- **Red "28" on the Review Queue tab** — a separate dashboard query that counts every pending row in any stage (including the 3 retired rows and the 9 invisible `qa_hold` rows), excluding only reserved blocks and three clinics.

## What `qa_hold` is

It is the Potential-OON safeguard. When the OON matcher flags a setter-submitted or already-approved appointment, `evaluate-potential-oon` pulls it back out of the client portal by setting `review_status='pending'` and `review_stage='qa_hold'` so QA can verify insurance first. Nothing in the Review Queue renders that stage, so these records are held but unreachable in the UI.

The 9 currently held (all `potential_oon = true`, none resolved):

```text
Charanjit Singh          Liberty Medical            Sep 02   Confirmed
Brenda Allen             Alliance Vascular          Aug 27   OON
AVA TEST DO NOT TOUCH    AVA Vascular               Sep 02   Confirmed
Paris Sweezer            Liberty Medical            Sep 02   OON
Jose Quinones            Liberty Medical            Aug 26   OON
Shamelia Burroughs       Liberty Medical            Sep 07   OON
Ruben Falcon             Liberty Medical            Sep 03   OON
Deborah Washington       Liberty Medical            Sep 03   OON
Elizabeth Spruill        Richmond Vascular Center   Sep 08   OON
```

## The fix

1. Align the bucket badges with their lists: exclude retired (superseded) rows from the count queries, so New reads 8.
2. Add a visible **QA Hold** bucket to the Review Queue (admins, agents, VAs, QA specialists) showing `review_stage='qa_hold'` rows with the Potential-OON match details and the existing verify / Confirm OON / Approve actions, so held records can be worked instead of sitting invisible.
3. Make the red Review Queue tab badge count the actionable buckets — New + Pending Review + QA Hold — excluding retired rows, reserved blocks, and the same excluded clinics. With today's data: 8 + 10 + 9 = 27, and it will always equal the sum of the visible bucket badges.

## Technical notes

- `src/components/admin/ReviewQueue.tsx`
  - `fetchCounts` `base()`: add `.or('is_superseded.is.null,is_superseded.eq.false')`; factor the shared filter application out so `fetch` and `fetchCounts` cannot drift again.
  - Widen `QueueView` with `'qa_hold'`, add the bucket button + count, and map it to `.eq('review_stage','qa_hold')` in `fetch`.
  - Reuse the existing Potential-OON panel (verify in-network / Confirm OON) already rendered for flagged rows.
- `src/pages/Index.tsx` → `fetchReviewCount`: add the superseded exclusion and `.in('review_stage', ['new','pending_review','qa_hold'])`.
- No database, RLS, or edge-function change needed — `qa_hold` rows already exist and are readable by these roles.
