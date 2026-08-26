# Hide "Sales Calendar" from Reserve Time Block

## Goal
The Reserve Time Block dialog's calendar picker currently shows the "Sales Calendar" option. Remove it so staff can't block time on it.

## Approach
`src/components/appointments/ReserveTimeBlockDialog.tsx` already filters the picker list (`CalendarCheckboxList`) to exclude "Call Back Request" calendars. Extend that same exclusion list with "sales calendar" (case-insensitive match).

Because `visibleCalendars` drives the list, Select All, and Deselect All, filtering at that one spot removes it everywhere — it can't be selected, searched, or included in "Select All".

## Technical details
- File: `src/components/appointments/ReserveTimeBlockDialog.tsx`, ~line 108
- Change: add `.filter(c => !c.name.toLowerCase().includes('sales calendar'))` alongside the existing 'call back request' filter.

## Verification
- Open the Reserve Time Block dialog on a project whose GHL account has a Sales Calendar and confirm it no longer appears, while other calendars are unchanged.
