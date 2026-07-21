# Inline Patient Portal Record in QA Operations Queue

## Goal
Replace the "View in project portal" button (which opens `/project/<name>` in a new tab) with an inline modal/drawer that shows the patient's appointment record directly on the QA Operations page — no tab switch, no navigation away.

## Approach

The QA queue already renders `AppointmentCard` inline for the selected case (visible in the screenshot). What the "View in project portal" button currently adds is the richer *project-portal-scoped* context (portal-styled detail view). We'll replicate that inline via a large `Dialog` (or `Sheet`) that mounts the same detailed appointment view used in the project portal, scoped to this one appointment.

## Changes

**`src/components/admin/QAOperationsQueue.tsx`**
- Remove `window.open('/project/...', '_blank')` on the "View in project portal" button.
- Add local state `portalRecordOpen: boolean` and reuse the existing `caseData.appointment_id`.
- On click, open a full-width `Dialog` (`max-w-6xl`, `max-h-[90vh]`, scrollable) titled "Patient portal record — {lead_name}".
- Inside the dialog, render the project-portal detailed appointment view for that single appointment id. Reuse `DetailedAppointmentView` (already used in `AppointmentCard` / portal) fed by a small fetch of the appointment row by id, so we don't need to load the whole project portal.
- Keep the button label but drop the `ExternalLink` icon; use a "Maximize2" icon to signal in-page open.

**No changes to** routing, `ProjectPortal.tsx`, or the button's permissions logic.

## Technical notes
- `DetailedAppointmentView` accepts an appointment object; we'll query `all_appointments` by `caseData.appointment_id` on dialog open and pass the row in, with a small loading state.
- The right-hand QA audit drawer stays mounted, so QA can save audit details and open the record simultaneously.
- Closing the dialog returns focus to the QA case with no re-fetch of the queue.

## Out of scope
- Embedding the entire project portal (tabs, filters, etc.) — not needed for QA review.
- Changing how the "Open in GHL" link works (still external, as intended).
