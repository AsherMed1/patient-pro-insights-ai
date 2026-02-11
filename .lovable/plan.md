

# Lift Appointment Cards for a Modern Look

## What Changes
Update the appointment card container styling to give each card a "lifted" floating appearance with enhanced shadows, more rounded corners, and subtle hover effects -- matching the reference design.

## Visual Effect
- Cards will appear to float above the page with a soft, layered shadow
- More rounded corners for a modern feel
- Subtle hover lift animation for interactivity
- Clean white background with refined border

## Technical Details

### File: `src/components/appointments/AppointmentCard.tsx` (line ~914-919)

Update the card container `div` classes:

**Current:**
```
"border rounded-lg p-3 md:p-4 space-y-3 shadow-sm transition-colors duration-300"
```

**New:**
```
"border border-border/40 rounded-xl p-4 md:p-5 space-y-3 shadow-soft-md hover-lift transition-all duration-300"
```

Key changes:
- `rounded-lg` to `rounded-xl` -- more rounded corners
- `shadow-sm` to `shadow-soft-md` -- uses the existing design system's soft shadow for a lifted look
- Add `hover-lift` class -- existing utility that lifts the card on hover with enhanced shadow
- `border` to `border border-border/40` -- softer border for a cleaner appearance
- Slightly more padding: `p-3 md:p-4` to `p-4 md:p-5`

These classes (`shadow-soft-md`, `hover-lift`) are already defined in the project's `index.css` design system, so no new CSS is needed.

