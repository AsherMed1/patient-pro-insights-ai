# QA Operations – Notifications & @Mentions

Three of the four items are already live in the portal; the fourth (sticky header) is the real gap.

## Already working (verified in code)
- **Ticket resolution notifies the assigned QA.** When Control Hub reports a resolved ticket, the case auto-completes and a notification titled "Ticket … resolved — audit completed" is sent to the assigned QA, the escalation owner, and the escalator.
- **AM and Tech @mentions.** `@AM` (Marissa, Duncan) and `@Tech` group aliases resolve to their members and notify each one, both in QA notes and in Control Hub comments.
- **Notifications deep-link to the record.** Clicking a notification opens the QA case (or the patient appointment) and scrolls to the exact note.

If any of these are misbehaving in practice, give me a specific example (patient/ticket) and I'll debug that path.

## To build: keep the notification bell visible while scrolling
Make the portal header sticky so the logo, user info, bell, settings, and sign-out stay pinned at the top on every dashboard variant (admin/agent, QA specialist, review-only/setter, recapture-only).

Behavior:
- Header sticks to the top of the viewport as the page scrolls, with a solid background and subtle bottom border so table rows don't bleed through.
- Sits above sticky table columns already used in the QA queue, so nothing overlaps it.
- Unchanged on mobile aside from staying pinned.

## Technical notes
- `src/pages/Index.tsx`: the header `div` is duplicated across four role branches. Extract it into a small `PortalHeader` component (subtitle + optional actions as props) and give it `sticky top-0 z-40 bg-gray-50/95 backdrop-blur border-b`, with the page padding adjusted so it spans full width.
- The QA table uses `z-10`/`z-20` sticky cells, so the header needs a higher z-index (`z-40`).
- No database, edge function, or notification-logic changes.
