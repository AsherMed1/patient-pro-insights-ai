## They're not lost — each one moved to a different (correct) destination

I queried `all_appointments` and `appointment_notes` for the three GHL contact IDs. All three rows are present, not superseded, and behaving exactly as the Review Queue rules dictate. None of them are in the Review Queue's default "Pending" tab anymore, which is why it looks like they vanished.

### Current state

| Lead | status | review_status | Where it lives now |
|---|---|---|---|
| Kenneth Cox | Confirmed | approved | Liberty portal → **Upcoming** tab (July 6) |
| Estela Morales | Cancelled | approved | Liberty portal → **Completed** tab (June 26) |
| Shakonya Baynes | OON | oon | Review Queue → **OON** tab (admin-only, hidden from portal) |

### Why each one left the pending Review Queue

1. **Kenneth Cox** — backfill ran against a contact that already had the `approved` tag in GHL (or came through with `Insurance Intake Source = Setter Submitted`), so `ghl-webhook-handler` auto-approved him. He skipped the queue by design and is now on the portal Upcoming tab. Correct behavior.

2. **Estela Morales** — backfilled as `pending`, but at **14:22 CT today** GHL sent a Cancelled webhook for her appointment. The handler accepted the status change and wrote an audit note: *"Status changed from Confirmed to Cancelled via GoHighLevel — Jun 26, 2026, 2:22 PM"*. Per the existing rules, status=Cancelled routes her to the Completed tab. Her `review_status` was set to `approved` somewhere in that flow, so she is now visible on the client portal under Completed. **This is worth a second look** — a still-pending row that gets cancelled by GHL probably shouldn't auto-flip to `approved`; it should either stay pending or get dismissed. See "Open question" below.

3. **Shakonya Baynes** — at **18:53 UTC** Mandy (`mandy.m@patientpromarketing.com`) marked her OON from the Review Queue. Per the core rule "Marking OON from the Review Queue sets `review_status='oon'` and the row stays admin-only (visible only in Review Queue → OON tab, hidden from every client portal view)." So she is correctly in **Review Queue → OON tab**, not in Pending and not on the portal. Audit note confirms: *"Status changed from Confirmed to OON by mandy.m"*.

### Where to find each one in the UI

- **Pending Review Queue tab** → none of the three (by design)
- **Review Queue → OON tab** → Shakonya Baynes
- **Liberty Joint & Vascular portal → Upcoming** → Kenneth Cox
- **Liberty Joint & Vascular portal → Completed** → Estela Morales

### Open question for you

Did you intend for Estela to land on the client portal as a Cancelled appointment, or should she have stayed in the Review Queue? Right now the flow is:

```
backfill → review_status=pending
GHL cancel webhook → status=Cancelled, review_status auto-flipped to approved
→ visible to client as a Cancelled appointment they never saw booked
```

If you want, I can change the `ghl-webhook-handler` so that when an incoming GHL status change targets a row whose `review_status='pending'`, the status update is applied but `review_status` stays `pending` (or flips to `dismissed`), so the client never sees a booking they were never notified about. That is a separate fix from this investigation and only needs your go-ahead.

## Technical notes

- No data loss, no superseded rows, no RLS issue. The three rows are queryable directly and the audit trail is intact.
- The "missing" perception is entirely a tab-routing effect: each lead is in a tab other than the default Pending tab of the Review Queue.
- If you want, I can add a "Recently approved" or "Recently resolved" sub-tab to the Review Queue so backfilled leads that auto-approve or get acted on stay visible to admins for a few hours after — also a separate change, on your call.
