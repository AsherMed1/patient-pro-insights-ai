---
name: GHL stale booking replay + cancel echo
description: Webhook rejects replayed already-rescheduled bookings and ignores GHL cancellation echoes triggered by cancelling a duplicate row.
type: constraint
---
GoHighLevel sometimes re-sends an **already-rescheduled** booking under a brand-new `ghl_appointment_id` hours after the reschedule (Dejan Petkovski, Texas Endovascular - Houston Vein Clinic, Aug 2026). Without a guard this creates a second active row for the contact.

Rules in `ghl-webhook-handler`:
- `findStaleReplayTarget()` runs before any CREATE. If an active, non-terminal sibling for the same `ghl_id + project_name` is dated **later** than the incoming booking **and** its `reschedule_history` contains a `previous_date`/`previous_time` matching the incoming slot, the incoming event is a replay: attach its event id to the surviving row, write an internal note, and skip the insert.
- `isSiblingCancelEcho()` runs on UPDATE. When the incoming status is Cancelled and another row for the same contact+project was cancelled in the portal within the last 180s, the status update is suppressed. Cancelling a duplicate in the portal was cancelling the contact's **live** appointment in GHL and echoing back (Dejan's Sep 24 row had to be manually restored).

Never assume the incoming webhook booking is the winner — `supersedeOlderContactRows()` only retires older siblings and cannot catch this case.
