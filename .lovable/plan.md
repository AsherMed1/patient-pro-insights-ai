# Export the 164 DOB-sync records to CSV

Produce a downloadable CSV listing every appointment whose intake-notes date-of-birth line was rewritten to match the stored date of birth during the backfill.

## What the file contains

One row per record, 164 rows, sorted by clinic then patient name, with these columns:

- Patient name
- Clinic
- Stored DOB
- Notes DOB line (the exact text now in the intake notes)
- Appointment date (blank for unscheduled records)
- Portal ID

## Notes

- The records are identified by the verification timestamp stamped during the backfill, so the list is exactly the 164 that were touched.
- 10 of these still hold a current-year DOB that is wrong in both places; they will be included and can be flagged as a follow-up list.

## Technical detail

Read-only query against `all_appointments` filtered on the backfill's `dob_verified_at` timestamp window, exported to `/mnt/documents/dob_notes_sync_backfill_164.csv`. No data or code changes.
