# Location picker for notice rules

Replace the free-text "Location (optional)" box in the notice-rules editor with a dropdown of the clinic's real locations, so rules always match what alerts resolve.

## Where locations come from

The project's calendars in the appointment data. The same extraction already used by the calendar view's location legend (`extractLocationFromCalendarName`) turns calendar names like "Consultation at Hendersonville, TN" into "Hendersonville". Distinct values for the project become the dropdown options, sorted alphabetically, with legacy/retired locations filtered out exactly as the legend does.

## Behavior

- Dropdown options: "Any location" (default, same as leaving it blank today) plus one entry per detected location.
- If no locations can be detected for the project, fall back to the current free-text input so the rule can still be created.
- Existing rules keep showing their saved location badge; nothing about saved data or matching logic changes.

## Technical notes

- Edit `src/components/projects/ShortNoticeRules.tsx` only.
- Load locations with one query on `all_appointments` (`calendar_name`, `parsed_pathology_info`) filtered by `project_name`, reusing the exported `extractLocationFromCalendarName` from `src/components/appointments/LocationLegend.tsx`.
- Swap the `Input` for a shadcn `Select`; empty value means "any location", preserving the current `location.trim() || null` payload.
- No database or edge function changes.
