# Add Email Search to Client Portal

## Problem
The portal currently supports searching appointments by **Name**, **Phone**, and **DOB** only. When patient names differ between systems (e.g., GHL says "Stefan Greenlee" but the portal shows "Steff Knee"), staff have to leave the portal and dig through Slack/GHL to reconcile records by email. Email is usually the most reliable unique identifier.

## Goal
Add **Email** as a fourth search option in the appointments search bar so VAs, Setters, AMs, and PMs can look up a patient directly by email address.

## Scope
Frontend-only change. No DB, RLS, or webhook changes. Behavior limited to the appointments search UI used across the project portal (`AllAppointmentsManager`) — the same dropdown that already toggles Name / Phone / DOB.

## Changes

### 1. `src/components/appointments/AppointmentFilters.tsx`
- Widen the `searchType` union from `'name' | 'phone' | 'dob'` to include `'email'` (props type + Select handler signature).
- Add `<SelectItem value="email">Email</SelectItem>` to the search-type dropdown (line ~254).
- Extend the input `placeholder` ternary to show `"Search email..."` when `searchType === 'email'`.
- Update the active-filter chip label (line ~366) to render `Email: {searchTerm}` when applicable.

### 2. `src/components/AllAppointmentsManager.tsx`
- Widen the `useState<'name' | 'phone' | 'dob'>` declaration (line 67) to include `'email'`.
- Add an `else if (searchType === 'email')` branch to each of the four query builders that already handle name/phone/dob:
  - Count query (~line 261)
  - Appointments data query (~line 415)
  - Tab-specific query (~line 568)
  - Excel-export query (~line 1470)
- Each branch applies `query.ilike('lead_email', '%' + searchTerm.trim() + '%')`. No phone-style normalization needed.

## Out of scope
- Lead search (`useLeads`), chat patient combobox, and other search surfaces — unchanged.
- No new DB index. `lead_email` searches are already partial-match `ilike`; volume is small per project and matches the existing name-search pattern.
- No memory rule update needed — this is a UI enhancement, not a policy.

## Verification
- Open a project portal → search bar → dropdown now shows Name / Phone / DOB / **Email**.
- Pick Email, type a partial address (e.g. `stefan@`) → matching appointments load across New / Upcoming / Needs Review / Completed / All tabs and the active-filter chip reads `Email: stefan@`.
- Excel export with an email filter active exports only the filtered rows.
