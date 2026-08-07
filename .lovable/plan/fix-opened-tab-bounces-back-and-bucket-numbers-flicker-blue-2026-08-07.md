# Fix: "Opened" tab bounces back, and bucket numbers flicker blue/grey

## What's happening

Two symptoms, one shared cause: the queue treats "you are not on the New tab" as "a filter is active".

1. **Can't enter Opened.** There is an auto-switch rule: when a filter is active and the current bucket is empty, jump to the first bucket that has rows. Because simply clicking away from New counts as "a filter is active", and Opened currently has 0 records, clicking Opened immediately satisfies both conditions and the view snaps back to New. Pending/Escalated, Completed and All all have rows, so they work — Opened is the only empty one, which is why it looks like that one tab is broken.
2. **Numbers change colour.** The count badge next to each tab is styled blue when "a filter is active" and grey otherwise. Since changing tabs flips that flag, all the counts change colour every time you move between tabs.

## The fix

- Stop counting the selected tab as an active filter. Active filter = search text, clinic selection, alert type, assignment, or date range only.
- Make the auto-switch rule fire only when the search/filter inputs actually change, never in response to a manual tab click. An empty bucket the user deliberately opened stays open and shows the normal "no records" empty state.
- Keep the badge colour tied purely to whether the bucket has records, so the numbers no longer flip blue/grey as you navigate.
- "Clear all filters" keeps working; it also returns the view to New as it does today.

## Technical detail

In `src/components/admin/QAOperationsQueue.tsx`:
- Remove `tab !== 'new'` from the `hasActiveFilter` memo.
- Rework the auto-switch `useEffect` so it keys off a signature of the filter inputs (search/project/alert/assignment/dates) held in a ref, and only redirects when that signature changed since the last run — not when `tab` or `bucketCounts` change for other reasons.
- Change the tab badge `variant` to depend on `bucketCounts[t.value] > 0` instead of `hasActiveFilter && ...`.
