
## Default the Appointment Date/Time Editor to GHL Calendar Availability

### Problem

When a setter clicks the pencil (Edit) button on an appointment card, the popover opens with a free-form calendar and a manual time input. This is effectively "Custom mode" -- the setter can pick any date and any time, regardless of what's actually available on the GoHighLevel (GHL) calendar. This nudges setters into custom-booking even when they don't intend to.

### Solution

Replace the current free-form date/time popover with a two-mode editor that defaults to "Default" (availability-based) mode:

1. **Default mode (shown first):** Fetches available time slots from the GHL calendar API for the selected date and displays them as clickable buttons. The setter picks a date, sees available slots, and clicks one.
2. **Custom mode (opt-in):** A small toggle or link at the bottom says "Use custom time" which reveals the current free-form time input. This makes custom booking intentional rather than accidental.

### New Edge Function: `get-ghl-availability`

Create a new edge function that calls the GHL Calendar Free Slots API:

```
GET https://services.leadconnectorhq.com/calendars/{calendarId}/free-slots
  ?startDate=2026-03-09T00:00:00Z
  &endDate=2026-03-09T23:59:59Z
  &timezone=America/Chicago
```

This returns available time slots for a given calendar and date. The function will:
- Accept `calendarId`, `date`, `timezone`, and `ghl_api_key` in the request body
- Look up the calendar ID from the appointment's project if not provided
- Return an array of available time slots (e.g., `["09:00", "09:30", "10:00", ...]`)

### Client-Side Changes

**`src/components/appointments/AppointmentCard.tsx`** (the Edit popover, lines 1400-1432):

Replace the current simple time `<Input>` with a new component that:

1. Starts in "Default" mode showing a loading spinner, then available time slots as pill buttons
2. When a date is selected on the calendar, fetches slots from the new edge function
3. Includes a small "Custom time" toggle at the bottom that switches to the existing free-form time input
4. Persists the mode selection only for the current popover session (resets to Default when reopened)

**New component: `src/components/appointments/AvailableTimeSlots.tsx`**

A reusable component that:
- Takes a `calendarId`, `date`, `timezone`, and `ghlApiKey` as props
- Fetches and displays available time slots as clickable buttons
- Shows a loading state while fetching
- Shows "No available slots" with a prompt to use custom time if none found
- Calls `onSelectTime(time)` when a slot is clicked

### Determining the Calendar ID

The edit popover needs the GHL calendar ID to fetch availability. This will come from:
- The appointment's existing `calendar_name` matched against the project's GHL calendars (already fetchable via `get-ghl-calendars`)
- Or from the project's `ghl_location_id` to fetch all calendars and find the matching one

The `AppointmentCard` already has access to `appointment.ghl_location_id` and the `useGhlCalendars` hook. On popover open, it will:
1. Fetch calendars for the project's GHL location (if not already cached)
2. Match the appointment's `calendar_name` to find the calendar ID
3. Pass that calendar ID to the availability fetcher

### UI Layout (Default Mode)

```text
+---------------------------+
|    [  Calendar Picker  ]  |
|                           |
|  Available Times:         |
|  [9:00 AM] [9:30 AM]     |
|  [10:00 AM] [10:30 AM]   |
|  [11:00 AM] [11:30 AM]   |
|                           |
|  --- or ---               |
|  [Use custom time]        |
+---------------------------+
```

### UI Layout (Custom Mode)

```text
+---------------------------+
|    [  Calendar Picker  ]  |
|                           |
|  Time: [__:__ input]      |
|                           |
|  [Show available times]   |
+---------------------------+
```

### Files to Create/Change

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/get-ghl-availability/index.ts` | Create | New edge function to fetch GHL calendar free slots |
| `src/components/appointments/AvailableTimeSlots.tsx` | Create | New component showing available time slot buttons |
| `src/components/appointments/AppointmentCard.tsx` | Modify | Replace the edit popover time section with the new Default/Custom mode UI |

### Edge Cases

- **No GHL location/API key configured:** Falls back to custom-only mode (current behavior)
- **No matching calendar found:** Shows a message and defaults to custom mode
- **API error fetching slots:** Shows error with option to retry or use custom time
- **No available slots for selected date:** Shows "No slots available" with custom time option
