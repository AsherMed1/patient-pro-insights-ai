## Restore 4 Davis leads only

Scope narrowed per your request — no trigger changes, no sweep. Just restore the four rows the earlier `time_preference` update clobbered back to Cancelled.

### Change
Update the following Davis Vein & Vascular rows in `all_appointments`:

- Abron Johnson
- Michael Daigle
- Terry Sadler
- Loretta Brown Freddie

Set:
- `status = 'Cancelled'`
- `internal_process_complete = true`

### Notes
- Trigger `handle_unscheduled_time_preference_change` stays as-is. If any of these four rows has their `time_preference` edited again later, it will re-clobber to Pending — we accept that risk for now.
- No schema changes, no code changes, no other projects touched.
