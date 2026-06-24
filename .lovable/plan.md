## Problem

The "Created:" line on appointment cards formats `appointment.created_at` (UTC) with `toLocaleString` (via `formatDateTime` in `src/components/appointments/utils.ts`), so it renders in the **viewer's browser timezone**. Example: Gloria Smith (Champion Heart and Vascular Center) shows `Jun 25, 2026, 1:41 AM` for a viewer in a different timezone, while GHL — which renders in the sub-account's timezone — shows `Jun 24 2026, 11:03 AM`.

GHL's source of truth is the project's timezone (stored on `projects.timezone`, e.g. `America/Chicago` for Champion). All other appointment time strings (Appointment date/time, slot pickers) already render in the project timezone using `formatInTimeZone`. Only "Created" was left on browser-local formatting.

## Fix

Format `appointment.created_at` in the project's timezone wherever the "Created" line is shown for an appointment.

### Scope (one display location)

- `src/components/appointments/AppointmentCard.tsx`, line ~1565 — the only place "Created: ..." is rendered for appointments. `DetailedAppointmentView`, `ReviewQueue`, and admin/audit views don't render a user-facing "Created" string for the appointment itself.

### Implementation

1. **Timezone cache** — add a tiny module-level `Map<projectName, timezone>` in `AppointmentCard.tsx` (or a new `src/utils/projectTimezoneCache.ts` if cleaner) so we fetch each project's timezone at most once per session. Many cards on screen share the same `project_name`; without a cache we'd issue one `projects` query per card.

2. **Eager fetch on mount** — in `AppointmentCard`, add a small `useEffect` keyed on `appointment.project_name` that:
   - returns the cached timezone if present,
   - otherwise queries `projects.timezone` once, stores it in the cache, and sets local state.
   - Falls back to `America/Chicago` when missing (consistent with other code paths in the file).
   The existing lazy fetch on "show dialog" stays as a safety net.

3. **New formatter** — render `Created:` with `formatInTimeZone(appointment.created_at, projectTimezone, 'MMM dd, yyyy h:mm a')`. Implement either inline or as `formatDateTimeInProjectTimezone(value, tz)` in `src/utils/dateTimeUtils.ts` for reuse. Output format stays identical to today's `formatDateTime` — only the timezone changes.

4. **No backend / schema changes.** No migration. No edge function changes. `created_at` itself remains a UTC timestamp; we only change how it's displayed.

### Verification

- Open Champion Heart and Vascular Center → Gloria Smith (`6d51fed6…`). "Created" should read `Jun 24, 2026, 11:03 AM` (matching GHL) regardless of the viewer's browser timezone.
- Spot-check a project on a different timezone (e.g. an EST project) to confirm the displayed Created shifts with the project's tz, not the viewer's.
- Confirm Appointment date/time line is unchanged.

### Out of scope

- "Appointment:" date/time rendering (already correct).
- Notes timestamps, audit logs, message bubbles — those intentionally show the viewer's local time and aren't tied to a GHL sub-account.
