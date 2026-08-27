# Bella Kumar should show as Cancelled, not Welcome Call

## Current state (verified in the database)

Champion Heart has three rows for Bella Kumar:

```text
Aug 20  08:00  Cancelled      declined   hidden (superseded)
Aug 28  09:00  Welcome Call   approved   hidden (superseded)
Aug 28  09:00  Welcome Call   approved   VISIBLE   <- the re-booked GHL event
```

The visible row is the re-booking GoHighLevel cancelled at 4:02 PM on Aug 27. My previous repair made it visible again but left the status as Welcome Call, so the clinic now sees an active-looking appointment for a cancelled booking.

## Fix

1. Set the visible row (`ed701a5a`) to **Cancelled**, keeping it visible in the portal (not declined, not superseded) with the Welcome Call attempt history intact, and add an internal note explaining that GoHighLevel cancelled the booking on Aug 27 at 4:02 PM.
2. Correct the visibility safeguard so this pattern resolves correctly on its own next time.

## Safeguard correction

`ensureContactRemainsVisible` in the GHL webhook handler currently un-supersedes an older sibling when a cancellation would leave a contact with no visible row. That restores the wrong picture — it revives a booking that no longer exists in GoHighLevel.

Change the rule to: when a GHL cancellation would leave the contact with nothing visible, keep the cancelled row itself visible with status `Cancelled` instead of hiding it behind a decline, and do not resurrect the superseded sibling. The patient stays reachable in the portal, and the status honestly reflects GoHighLevel.

## Technical detail

- Data fix: update `all_appointments` row `ed701a5a-169d-41ab-bdce-c2f38483f881` to `status='Cancelled'`, `review_status='approved'`, `is_superseded=false`; insert an internal `appointment_notes` row. Leave the two superseded rows untouched.
- `supabase/functions/ghl-webhook-handler/index.ts`: rework `ensureContactRemainsVisible` to un-decline / keep visible the cancelled row (status `Cancelled`, `review_status='approved'`) rather than un-superseding a sibling; keep the existing same-slot `carryForwardPortalState` behaviour unchanged. Redeploy the function.
- No schema change, no frontend change.
