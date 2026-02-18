
# Fix: Confirmed Status Showing Blank in Calendar View

## Root Cause

Some appointments in the database have status stored as lowercase `"confirmed"` instead of capitalized `"Confirmed"`. The status dropdown uses strict value matching -- when the stored value `"confirmed"` doesn't exactly match any `SelectItem` value (`"Confirmed"`), the dropdown appears blank.

This affects STC (Southern Tennessee Cardiology) appointments and likely others. Ozark works because their statuses were stored with proper capitalization.

## Fix

**File: `src/components/appointments/DetailedAppointmentView.tsx`**

Normalize `currentStatus` when it's set so it always matches the capitalization in `statusOptions`. This means:
- When `appointment.status` is read (initial state and in the `useEffect`), find the matching entry in `statusOptions` (case-insensitive) and use the properly capitalized version
- If no match is found, use the raw value as-is

This is a small change to the `useState` initializer and the `useEffect` that syncs the status -- adding a normalization step using the existing `statusOptions` array.
