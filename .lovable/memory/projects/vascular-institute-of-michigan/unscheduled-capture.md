---
name: Vascular Institute of Michigan unscheduled capture
description: Vascular Institute of Michigan captures leads with time_preference instead of a booked date/time, like Premier/ECCO/Davis/Horizon/Prospero.
type: feature
---
Vascular Institute of Michigan (GHL location `TNqlJFl1yDyS7eIXWtlf`) is an unscheduled-capture project: intake submits a **Time Preference** (morning/afternoon/evening/no_preference) with no GHL calendar booking.

Requirements:
- Must be present in `UNSCHEDULED_CAPTURE_PROJECTS` in `ghl-webhook-handler`, otherwise lead-only payloads are dropped ("Skipping lead-only payload for non-unscheduled project") and the lead never reaches the portal.
- Also listed in `UNSCHEDULED_PROJECTS` in `all-appointments-api` (one-active-row-per-contact dedupe) and in the AppointmentCard project array that renders the set-date/time control.
- `import-missing-leads-from-ghl` extracts `Time Preference` from intake notes when there is no booked date.

Whenever another clinic switches to Time Preference, all of these lists must be updated together.
