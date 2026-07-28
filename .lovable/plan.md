## Goal

Re-issue the Prospero Vascular and Interventional Q2 2026 (Apr 1 – Jun 30) Welcome Call timing export, adding a cancellation-source breakdown so Dean/Duncan can see how many cancellations came from GHL vs the portal — and how that affects the Welcome Call rate.

## What the data shows (verified)

For Prospero, non-superseded, appointment date in Q2 2026, status = Cancelled: **57 records** (the earlier 54 reflected the report's Reserved-block exclusion; the new file will reconcile the exact set to match the original export's row universe).

Every portal status change writes an `appointment_notes` row: `Status changed from "X" to "Cancelled" by <name>`. GHL-driven changes write the same note with `created_by = 'GoHighLevel'`. For these cancellations:

- 54 attributed to a portal user (Alicia Garcia Corral)
- 2 attributed to GoHighLevel
- 1 has no status-change note (will be labeled "Unknown")

So the answer is already visible: cancellations are overwhelmingly portal-driven, not GHL — meaning GHL cancellations are not the reason Welcome Calls were skipped. The export will make that explicit rather than asserted.

## Output

Same row universe as the original export, with new columns on the main sheet:

- Cancellation Source (Portal / GHL / Unknown)
- Cancelled By (name or "GoHighLevel")
- Cancelled At (project timezone)
- Cancelled Before Welcome Call? (Y/N/n/a)
- Cancellation Reason (from the System "Cancellation Reason:" note where present)

Plus a new **Cancellation Source** sheet:

- Counts and % by source (Portal / GHL / Unknown)
- Within each source: how many had a Welcome Call vs none
- Welcome Call rate by source, and how many cancellations happened before any Welcome Call attempt was possible
- Short read-out line answering the ticket question directly

Delivered as:

1. `prospero_welcome_call_timing_q2_2026_v2.csv`
2. `prospero_welcome_call_timing_q2_2026_v2.xlsx` — Detail, Summary, and new Cancellation Source sheets

## Technical notes

- Read-only. SQL against `all_appointments` + `appointment_notes` (+ `audit_logs` as a cross-check on portal attribution), assembled with pandas/openpyxl.
- Source classification: `created_by = 'GoHighLevel'` → GHL; any other author on a `Status changed ... to "Cancelled"` note → Portal; no such note → Unknown.
- Welcome Call timestamps reuse the same extraction logic as the original export so the two files stay comparable.
- No app code, schema, or record changes.
