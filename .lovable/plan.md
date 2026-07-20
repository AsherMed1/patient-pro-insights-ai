## Fixes for QA Operations Queue

### 1. Remove Cancelled / No Show from the queue UI

The DB triggers already divert Cancelled/No Show to `qa_metrics_events` and no longer create queue cases, but `QAOperationsQueue.tsx` still lists them as filter options and label variants, so any legacy rows (or a future trigger regression) would still render. Tighten the UI to Confirmed audit + OON + Short Notice only.

- `src/components/admin/QAOperationsQueue.tsx`
  - `AlertType` union → drop `'cancelled' | 'no_show'`.
  - `ALERT_LABELS` → remove the `cancelled` and `no_show` entries.
  - Alert-type filter `<Select>` → remove the two `<SelectItem>`s.
  - Row fetch query → add `.in('alert_type', ['short_notice','oon','confirmed_audit'])` so any legacy Cancelled/No Show cases are hidden from the queue (they remain in the DB for historical reference but never appear).

Reporting/trend totals are unaffected — `qa_metrics_events` continues to receive Cancelled/No Show rows via the existing trigger.

### 2. Clickable "Open in GHL" icon (replaces the copy-paste Patient Link)

Mirror the pattern already used in `AppointmentCard.tsx` and `ReviewQueue.tsx`: an `ExternalLink` icon button that opens `https://app.gohighlevel.com/v2/location/{locationId}/contacts/detail/{ghl_contact_id}` in a new tab. Fallback to `https://services.leadconnectorhq.com/contacts/{ghl_contact_id}` when the location id can't be resolved (matches ReviewQueue's fallback).

- `src/components/admin/QAOperationsQueue.tsx`
  - Extend the `qa_cases` fetch to also select `ghl_location_id` and `ghl_contact_id` from the joined appointment (or resolve `ghl_location_id` from a projects lookup, keyed on `project_name`, cached once per mount — same approach as `AppointmentCard`).
  - **In the table row (next to the patient name / ID, matching the screenshot):** render a small `ExternalLink` icon button when `ghl_contact_id` exists. Clicking opens the GHL URL in a new tab (`target="_blank" rel="noopener noreferrer"`). Stops propagation so it doesn't also open the drawer.
  - **In the case drawer:** replace the read-only Patient Link input + Copy button with the same `ExternalLink` icon button labeled "Open in GHL". Remove the `Copy` import if no longer used elsewhere in the file.
  - Hide the icon (or show a disabled state) if `ghl_contact_id` is null.

### Technical section

- No DB migration required — the ingestion triggers already exclude Cancelled/No Show.
- No changes to `qa_metrics_events`, `create-controlhub-ticket`, or notes/activity tables.
- Files touched: `src/components/admin/QAOperationsQueue.tsx` only.
