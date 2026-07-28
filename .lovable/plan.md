## Goal

Deliver the original `prospero_welcome_call_timing_q2_2026` export — same row universe, same column order — with the cancellation-source breakdown merged directly into it, rather than as a separate v2 file.

## What changes

Take the original export exactly as it was (Detail sheet columns and row set unchanged), and append these columns at the end:

- Cancellation Source (Portal / GHL / Unknown)
- Cancelled By (user name or "GoHighLevel")
- Cancelled At (project timezone)
- Cancelled Before Welcome Call? (Y / N / n/a)
- Cancellation Reason (from the System "Cancellation Reason:" note where present)

Non-cancelled rows leave these blank.

## Output

1. `prospero_welcome_call_timing_q2_2026.csv` — the updated single flat file (this is the main thing requested)
2. `prospero_welcome_call_timing_q2_2026.xlsx` — same data, with the original Detail and Summary sheets plus the Cancellation Source summary sheet

Versioned filenames (`_v3`) will be used on disk to avoid overwriting the earlier artifacts, but the content is the updated original, not a separate side report.

## Verified data behind the new columns

- 57 Prospero cancellations with appointment date in Q2 2026 (non-superseded)
- 54 portal-driven (Alicia Garcia Corral), 2 GoHighLevel, 1 with no status-change note
- 33 of the 57 never had a Welcome Call logged; 30 of those were portal cancellations

Read-out: GHL cancellations are not what suppressed Welcome Call attempts.

## Technical notes

- Read-only. SQL against `all_appointments` + `appointment_notes`, assembled with pandas/openpyxl.
- Reuses the original export's Welcome Call extraction logic so numbers stay identical to the first file.
- Source classification: `created_by = 'GoHighLevel'` → GHL; any other author on a `Status changed ... to "Cancelled"` note → Portal; no such note → Unknown.
- No app code, schema, or record changes.
