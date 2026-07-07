---
name: Appointment slot uniqueness
description: Unique-slot enforcement on all_appointments ignores terminal/superseded rows so rebookings at the same date/time are allowed.
type: constraint
---
`all_appointments` uses a partial unique index `unique_appointment_ghl_datetime_active` on `(ghl_id, date_of_appointment, requested_time)` that only applies to active, non-superseded rows. Rows with status Cancelled/Canceled/No Show/Rescheduled/Do Not Call/OON/Welcome Call, or `is_superseded=true`, are excluded from the uniqueness check.

**Why:** the old full unique constraint `unique_appointment_ghl_datetime` blocked GHL rebookings at the same slot when a cancelled row already existed for the same contact, causing new confirmed appointments to silently fail insert (e.g. Jill Blevins, Apex Vascular, July 2026).

**How to apply:** never re-add a full unique constraint on that column set. If you need to change uniqueness rules, keep the partial predicate and update the excluded statuses list to match the current portal-terminal set.
