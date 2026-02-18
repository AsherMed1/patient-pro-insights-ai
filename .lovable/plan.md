

# Add Color-Coded Status Dropdown

## What Changes

Update the status `<Select>` dropdown in `DetailedAppointmentView.tsx` to show colored text/background on the trigger based on the current status value.

## Color Mapping

| Status | Color |
|--------|-------|
| Showed | Green (bg-green-100, text-green-800) |
| Confirmed | Blue (bg-blue-100, text-blue-700) |
| No Show | Yellow (bg-yellow-100, text-yellow-800) |
| Cancelled | Red (bg-red-100, text-red-700) |
| Rescheduled | Purple (bg-purple-100, text-purple-700) |
| OON | Orange (bg-orange-100, text-orange-800) |
| Do Not Call | Red-900 (bg-red-900, text-red-100) |
| Welcome Call | Gray (bg-gray-200, text-gray-800) |
| Other/default | Default styling |

These match the existing badge variants already defined in `badge.tsx`.

## File Changed

**`src/components/appointments/DetailedAppointmentView.tsx`**
- Add a helper function `getStatusColor(status)` that returns Tailwind classes based on the status value
- Apply those classes to the `SelectTrigger` so the dropdown button shows the appropriate color
- Optionally add small colored dots or backgrounds to each `SelectItem` in the dropdown list so users can see colors before selecting

