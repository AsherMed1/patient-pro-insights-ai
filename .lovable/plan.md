
# Remove Borders from Appointment Card Action Buttons

## What Changes
Change the three action buttons (View Details, View Insurance, Delete) on each appointment card from `variant="outline"` to `variant="ghost"`, removing their visible borders to match the clean icon-only style used for Settings and Sign Out.

## Technical Details

### File: `src/components/appointments/AppointmentCard.tsx`

Three buttons to update:

1. **View Details button** (line 1043): Change `variant="outline"` to `variant="ghost"`

2. **View Insurance button** (lines 1054-1059): Change `variant="outline"` to `variant="ghost"` and remove `border-blue-200` from className

3. **Delete button** (lines 1074-1077): Change `variant="outline"` to `variant="ghost"` and remove `border-red-200` from className
