

## Add Excel Export for Patient Appointments

### Overview
Add an "Export to Excel" button in the appointments manager that exports the currently filtered/visible appointment data to an `.xlsx` file.

### Implementation

**1. Install `xlsx` library**
- Add the `xlsx` (SheetJS) package — lightweight, client-side Excel generation with no server dependency.

**2. Create export utility** — `src/utils/exportAppointmentsToExcel.ts`
- A function that takes an array of `AllAppointment[]` and generates a downloadable `.xlsx` file.
- Columns to include: Patient Name, Phone, Email, DOB, Project, Date of Appointment, Time, Calendar/Location, Status, Procedure Status, Agent, Insurance Provider, Insurance Plan, Insurance ID, Date Created.
- Format dates for readability.
- Trigger browser download with a timestamped filename (e.g., `appointments_2026-04-07.xlsx`).

**3. Add Export button to UI** — `src/components/AllAppointmentsManager.tsx`
- Place an "Export to Excel" button in the card header area next to the existing appointment count description.
- The button calls the export utility with the current `appointments` array (the filtered, paginated data source — we'll export ALL filtered results, not just the current page).
- To export all filtered results, we'll need to fetch all matching records (not just the current page). Add a `fetchAllFilteredAppointments` function that runs the same query without pagination limits.

### Technical Details

| Item | Detail |
|------|--------|
| Library | `xlsx` (SheetJS Community Edition) |
| New file | `src/utils/exportAppointmentsToExcel.ts` |
| Modified file | `src/components/AllAppointmentsManager.tsx` |
| Export scope | All appointments matching current filters (not just current page) |
| File format | `.xlsx` with auto-column-widths |

