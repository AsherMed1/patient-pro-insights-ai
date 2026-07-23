## Changes to QA Operations Queue

**1. Rename bucket "In Review" → "Opened"**
- In `src/components/admin/QAOperationsQueue.tsx`, update the bucket label wherever "In Review" is shown in the UI (bucket tabs/filters, drawer status labels, dropdowns).
- Keep the underlying DB status value (`in_review`) unchanged to avoid migrations and preserve history; only the display label changes.

**2. Filter out "Reserved" calendar-block entries**
- These come from the clinic's GHL reserved-time-block calendar events (patient name like `Reserved` or `Reserved - Judy Appt`).
- Two-layer fix:
  - **Ingest guard** in `supabase/functions/ghl-webhook-handler/index.ts`: skip appointment creation when the contact/patient name matches `^reserved(\s*-\s*.*)?$` (case-insensitive). Log and return early so no `all_appointments` row and no QA case is created.
  - **QA Queue filter** in `QAOperationsQueue.tsx`: exclude cases whose patient name matches the same pattern, so any existing "Reserved" cases disappear from the queue immediately without waiting on cleanup.
- Optional cleanup (ask before running): bulk-mark existing "Reserved*" `qa_cases` as `completed` / `dismissed` and hide their `all_appointments` rows from the Review Queue.

## Questions before build
- For existing "Reserved" rows already in `qa_cases` and `all_appointments`, do you want them (a) just hidden by the filter, or (b) also bulk-cleaned up in the database?
