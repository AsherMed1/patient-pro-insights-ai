## Goal
Help setters spot short-notice bookings while triaging the Review Queue by adding a visual "Short Notice" badge to each pending row that already has (or qualifies for) a short-notice alert.

## Where
`src/components/admin/ReviewQueue.tsx` — Pending Review tab rows only. No changes to Declined tab, QA Operations, or business logic.

## How

1. When Pending Review rows load, collect their `appointment_id`s and fetch matching rows from `short_notice_alerts` (columns: `appointment_id`, `hours_difference`) in a single query. Build a Map keyed by appointment_id.
2. For each Pending Review row, if the appointment has a short-notice alert, render an amber "⚡ Short Notice · Xh" badge next to the patient name (same row as the existing "Duplicate" badge shown for James Nesbit in the screenshot).
   - Format: `< 1h` shown as minutes, otherwise rounded biz-hours (matches Slack alert wording).
3. Add an optional filter chip near the Pending/Declined tabs: "Short notice only" toggle that filters the visible list to badged rows. Off by default.
4. Sort tweak: within Pending Review, keep current sort but push short-notice rows to the top so setters see them first. (Simple client-side stable sort after fetch.)

## Out of scope
- No schema changes, no new edge functions, no changes to how short-notice alerts are generated.
- QA Operations Queue unchanged.
- No changes to Approve/Decline/OON logic.

## Technical notes
- Query: `supabase.from('short_notice_alerts').select('appointment_id, hours_difference').in('appointment_id', ids)`.
- Badge styling: reuse existing amber/orange token used elsewhere (e.g. OON button styling) via Tailwind — `bg-amber-100 text-amber-800 border border-amber-300`.
- The badge and the sort/filter operate on the already-fetched pending list, so no extra round-trips per row.
