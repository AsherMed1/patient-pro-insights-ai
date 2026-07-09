Delete two more duplicate portal appointments verified in `all_appointments`:

- Dianne Hill — `dca9800b-07e7-464e-8064-7c6e7be44bf3` (Georgia Endovascular)
- Leann Gray — `6449f530-d225-4dc3-a2eb-27d9facaa948` (Georgia Endovascular)

Both rows have NULL `date_of_appointment` and match the same pattern as the previous 7 duplicates created by the notes-only sync (already hardened in the last change).

## Steps
1. Delete the 2 rows from `all_appointments` by UUID. Child rows in `appointment_notes`, `appointment_tags`, `appointment_reschedules`, and `appointment_review_history` cascade automatically.
2. Confirm no rows remain for those IDs.

No code changes required — the guard added previously in `ghl-webhook-handler` already prevents recurrence.