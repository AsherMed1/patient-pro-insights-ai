

## Fix: Virtual Consultation Appointments Missing Service Type

### Problem
Ventra has calendar names like `"Request Your Virtual Consultation at Great Neck, NY"` with no procedure keyword (UFE, HAE, etc.). The `getEventTypeFromCalendar()` function only inspects the calendar name, so these appointments are classified as "Other" — even though their intake notes clearly contain procedure data (e.g., UFE pathology).

### Approach
Enhance `getEventTypeFromCalendar` to accept an optional fallback procedure string (from parsed data or intake notes). When the calendar name yields "Other," check the fallback.

### Changes

**File 1: `src/components/appointments/calendarUtils.ts`**
- Update `getEventTypeFromCalendar` signature to accept an optional `fallbackProcedure?: string` parameter
- After all calendar-name checks, before returning "Other," check `fallbackProcedure` against the same keyword set (UFE, HAE, GAE, PAE, etc.)

**Files 2-6: All callers of `getEventTypeFromCalendar` (6 files)**
- Pass `parsed_pathology_info?.procedure` or `patient_intake_notes` as the fallback parameter where appointment data is available
- Affected files: `CalendarDayView.tsx`, `CalendarDetailView.tsx`, `CalendarMonthView.tsx`, `CalendarWeekView.tsx`, `UpcomingEventsPanel.tsx`, `EventTypeLegend.tsx`

### How it works
```
Calendar name: "Request Your Virtual Consultation at Great Neck, NY"
  → No keyword match → check fallback
  → parsed_pathology_info.procedure = null
  → scan intake notes for "Pathology (UFE)" or "UFE STEP"
  → Match → return UFE event type
```

This is a UI-only change — no database or edge function modifications needed.

