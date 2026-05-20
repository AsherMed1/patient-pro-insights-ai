# VSNC: Virtual as a Location, Not a Service

## Problem

For Vascular Surgery Center of Excellence (VSNC), GHL calendar names like "Virtual GAE Consultation" and "Virtual Neuropathy Consultation" are currently surfacing as separate services ("Virtual GAE" vs "GAE"). They also are *not* exposed as a "Virtual" location, because we explicitly suppress Virtual from VSNC's location list. Result: virtual visits get split off in reporting and can't be filtered by location.

The rest of the codebase already strips "Virtual" out of service labels and treats "Virtual" as a location elsewhere — VSNC was the lone exception.

## Goal

For VSNC:
- Services in the dropdown: only the underlying types (e.g. GAE, Neuropathy) — no "Virtual ___" variants.
- Locations in the dropdown: the 4 physical clinics **plus** "Virtual" as the 5th option.
- Filtering by GAE returns both in-person and virtual GAE; filtering by "Virtual" returns all virtual visits across services.

## Changes

### 1. Stop excluding "Virtual" from VSNC's location list

Three files have an `isVSNC` guard that currently skips adding "Virtual" to the location set. Remove just the VSNC exclusion (keep the Neuropathy-filter exclusion where it exists, since that one is intentional UX for non-VSNC projects):

- `src/components/appointments/AppointmentFilters.tsx` (around line 124–135): drop `isVSNC` from the skip condition for adding the "Virtual" location.
- `src/components/appointments/LocationLegend.tsx` (around line 86–109): drop `isVSNC` from the Virtual-exclusion check.
- `src/components/projects/ProjectDetailedDashboard.tsx` (around line 113–126): drop `isVSNC` from the Virtual-exclusion check.

### 2. Service list — already correct, verify

The service extractor in all three files already strips a leading or trailing `Virtual` token from the service name and merges `In-person` into `GAE`. After the location change above, VSNC's service dropdown will naturally collapse to `GAE` and `Neuropathy` (plus anything else legitimately on their calendars). No new code needed here — just confirm by reading the existing regex paths.

### 3. Physical-location filter must exclude Virtual calendars

When the user picks a physical city for VSNC, virtual calendars that happen to mention the same city must not double-count. `ProjectDetailedDashboard.tsx` already does this. Mirror it in `src/components/AllAppointmentsManager.tsx` at the three places that apply `locationFilter` (count query ~line 285, list query ~line 431, export query ~line 579, plus the inline export at ~line 1459): when `locationFilter !== 'ALL' && locationFilter !== 'Virtual'`, add `.not('calendar_name', 'ilike', '%Virtual%')`. When it is `'Virtual'`, the existing `ilike '%Virtual%'` already does the right thing.

### 4. Memory

Add a small project-scoped memory note at `mem://projects/vsce/virtual-as-location` capturing the rule: "VSNC: Virtual is a location (5th option alongside the 4 physical clinics), never a service. GAE / Neuropathy filters include virtual visits."

## Out of scope

- No DB migration. Calendar names in GHL stay as-is; the UI handles the categorization.
- No changes to other projects' Virtual handling.
- No changes to event-type / procedure color tokens.

## Verification

- Open the VSNC project portal → Appointments tab. Confirm:
  - Service dropdown shows GAE and Neuropathy (no "Virtual GAE" / "Virtual Neuropathy").
  - Location dropdown shows the 4 physical clinics + "Virtual".
  - Filter GAE → returns both virtual and in-person GAE appointments.
  - Filter Location = Virtual → returns all virtual visits, both GAE and Neuropathy.
  - Filter Location = one physical clinic → excludes virtual visits even if the city name appears in the virtual calendar.
- Repeat on the Project Detailed Dashboard tab.
