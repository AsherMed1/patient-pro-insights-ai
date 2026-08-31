---
name: Cancellation reversal + patient identity edits
description: Reversing a cancellation/no-show within 5 minutes retracts the GHL lifecycle tags; Review Queue name/DOB edits write an internal note on the record.
type: feature
---
Two safeguards added after the Keona Jordan incident (Emage Fibroid Centers, Aug 30 2026), where an internal account cancelled + re-confirmed a live record within 15 seconds and renamed the patient to a junk value, making her unfindable in the clinic portal while GHL stayed tagged as cancelled.

- `changeAppointmentStatus` (`src/utils/appointmentStatusChange.ts`): when a row leaves Cancelled/No Show for an active status and the lifecycle tags were pushed less than 5 minutes earlier, it calls `retractLifecycleTags` (`src/components/appointments/cancellationTags.ts`) to remove `cancelled-portal`/`no-show-portal`, the reason tag and `do-not-reschedule`, and clears `cancellation_reason`.
- `ReviewQueue.tsx` `handleSaveEdit` writes an internal `appointment_notes` row for every name or DOB change, so a renamed patient is traceable from the record itself, not only the admin audit log.
