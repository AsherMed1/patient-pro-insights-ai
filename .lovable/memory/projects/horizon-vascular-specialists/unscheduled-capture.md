---
name: Horizon Unscheduled Capture
description: Horizon Vascular Specialists leads arrive without a calendar/date; store time_preference like Premier/ECCO/Davis.
type: feature
---
Horizon Vascular Specialists is an unscheduled-capture project. GHL sends leads with Morning/Afternoon preference but no `date_of_appointment` / `requested_time` / `ghl_appointment_id`.

`ghl-webhook-handler` must include `'horizon vascular specialists'` in both `UNSCHEDULED_PROJECTS` (create path) and `UNSCHEDULED_PROJECTS_UPDATE` (update path) allowlists. Rows land with `is_unscheduled=true`, `date_of_appointment=null`, `time_preference` extracted from intake notes, and appear in Review Queue → Needs Review / Unscheduled tabs.
