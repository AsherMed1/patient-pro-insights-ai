---
name: Horizon Unscheduled Capture
description: Horizon Vascular Specialists leads arrive without a calendar/date; store time_preference like Premier/ECCO/Davis.
type: feature
---
Horizon Vascular Specialists is an unscheduled-capture project. GHL sends leads with Morning/Afternoon preference but no `date_of_appointment` / `requested_time` / `ghl_appointment_id`.

`ghl-webhook-handler` must include `'horizon vascular specialists'` in both `UNSCHEDULED_PROJECTS` (create path) and `UNSCHEDULED_PROJECTS_UPDATE` (update path) allowlists. Rows land with `is_unscheduled=true`, `date_of_appointment=null`, `time_preference` extracted from intake notes, and appear in Review Queue → Needs Review / Unscheduled tabs.

**Calendar recovery:** Horizon's three GHL calendars (Rockville `7x89zo0Ev5hhZVyqNAwz`, Germantown `PpBNj2YGXka8PP5drkNE`, Olney `nry6I37wUs1BAWNhqbVY`) all return `isActive: false` from the GHL API even though they are live. `get-ghl-calendars` therefore no longer filters on `isActive` (inactive ones just sort last), and it can resolve location/API key from `project_name`. `ghl-webhook-handler` recovers `calendar_name` from the `Calendar ID:` / `Location Picker:` intake fields whenever the payload has no calendar, so unscheduled leads stay in the GAE service filter.
