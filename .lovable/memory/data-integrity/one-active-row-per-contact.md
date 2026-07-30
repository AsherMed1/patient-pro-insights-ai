---
name: One active appointment row per GHL contact
description: Webhook auto-supersedes a contact's older/closed rows on new booking and syncs lead_name across active rows, so patients never appear multiple times.
type: feature
---
Each GHL contact must surface exactly **one active** `all_appointments` row per project. GHL reschedules/rebookings emit a new `ghl_appointment_id`, which creates a new portal row (e.g. Orlando Gonzales, Ally Vascular, 3 rows).

`ghl-webhook-handler` now runs after a CREATE:
- `supersedeOlderContactRows` — marks sibling rows (`same ghl_id + project_name`, `is_superseded=false`) as `is_superseded=true` when their status is terminal (Cancelled/Canceled/No Show/Showed/Won/OON/Do Not Call/Rescheduled) **or** their date is before the new booking's date. Skips reserved blocks and `review_status='pending'` rows (must stay in the Review Queue). Writes a "Superseded by newer GHL booking …" note on each.
- `syncContactNameAcrossRows` — pushes the incoming contact name onto every non-superseded row for that contact, so a corrected GHL name (Rolando → Orlando) doesn't split one patient into two.

Superseding is non-destructive: history rows stay in the DB and in the Activity timeline; portal/dashboard views already exclude `is_superseded=true`.
