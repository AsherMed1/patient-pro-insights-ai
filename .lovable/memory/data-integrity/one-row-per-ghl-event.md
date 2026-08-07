---
name: One row per GHL appointment event
description: Webhook matching by ghl_appointment_id must handle multiple rows and self-heal duplicates; never single-row query.
type: constraint
---
`findExistingAppointment` in `ghl-webhook-handler` must NOT use `.maybeSingle()` when looking up by `ghl_appointment_id` + `project_name`. Multiple rows can legitimately share one event ID (declined/dismissed Review Queue snapshots, superseded history). A single-row query fails in that case, the webhook concludes "no match", and inserts yet another duplicate row (Susannah Teeters, Richmond Vascular Center, Aug 2026).

Rules:
- Fetch all matching rows ordered newest-first.
- If every match is a declined/dismissed snapshot: supersede them all and return null (fresh row).
- Otherwise pick the newest non-superseded usable row and **retire all other active rows sharing that event ID** (`is_superseded=true` + audit note naming the surviving record). A single GHL event can never hold two live bookings, regardless of date direction.
- Different-event siblings for the same contact keep the cautious date+time rule in `merge_older_active_siblings()` — do not force-merge those.

Detection: edge function `detect-duplicate-appointments` reports active duplicate groups (same event ID and same contact per project).
