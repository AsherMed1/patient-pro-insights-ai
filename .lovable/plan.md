# Add OON reasons and notes to Excel exports

Same idea as the cancellation export, applied to out-of-network records. Today OON reasons live in the notes and in the potential-OON flag details, and OON records marked from the Review Queue never appear in the appointments export at all.

## What changes

**1. Appointments export gains OON columns**

When you filter the appointments list to status = OON and export, the file already carries the Notes column. It will additionally include:

- **OON Reason** — the resolution/reason captured when the record was marked out of network.
- **Potential OON Flag** — whether the record was auto-flagged, and the plan or group number that matched (e.g. `Plan "Ambetter" → Ambetter Marketplace`).
- **Flagged Date** / **Resolved Date** — when the flag was raised and when a human resolved it.

**2. New export on the Review Queue → OON tab**

Records marked OON from the Review Queue are admin-only and are excluded from the appointments export, so those cancellation-style reports miss them entirely. The OON tab gets its own "Export to Excel" button producing the same column set (patient, project, location, appointment date, insurance provider/plan/ID, OON reason, flag details, reviewer, and the full Notes column newest-first).

Both exports include all notes — clinic-visible and internal — since the reasons usually sit in internal notes.

## Technical detail

- `src/utils/exportAppointmentsToExcel.ts`: extend `AppointmentRow` with `potential_oon`, `potential_oon_matches`, `potential_oon_flagged_at`, `potential_oon_resolved_at`, `potential_oon_resolution`, `review_status`, `reviewed_by`; add a `formatOonMatches` helper mirroring `formatNotes`; append the new columns after the reschedule columns; keep width caps and Notes wrapping.
- `src/components/AllAppointmentsManager.tsx`: no query change needed (`select('*')` already returns the OON fields) — the new columns populate automatically.
- `src/components/admin/ReviewQueue.tsx`: add an export button rendered only on the OON tab. It re-queries `all_appointments` for `review_status = 'oon'` (respecting the tab's project/date filters), then fetches `appointment_notes` for those ids in chunks of 200 ordered newest-first, and calls `exportAppointmentsToExcel` with the grouped notes map — the same pattern used by the appointments export.
- Read-only additions; no schema or backend changes.
