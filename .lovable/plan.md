
# Fix: Remove Double Card Border Between Sections

## Problem
The "Appointment Management" header with its own bordered card (`section-card` class) is nested inside the parent `Card` component from `AllAppointmentsManager`. This creates a visible double-border/nested-card effect with unnecessary visual separation.

## Solution
Remove the `section-card` wrapper and the redundant "Appointment Management" header from `AppointmentsTabs`. The parent Card in `AllAppointmentsManager` already provides the title ("All Appointments"), border, and padding -- the inner card is redundant.

## Technical Details

### File: `src/components/appointments/AppointmentsTabs.tsx`

**Lines 74-81** -- Remove the `section-card` wrapper div and the "Appointment Management" header block:

Replace:
```tsx
<div className="section-card animate-fade-in-up">
  <div className="flex items-center gap-2.5 mb-6">
    <div className="p-2 bg-primary/10 rounded-lg">
      <Calendar className="h-5 w-5 text-primary" />
    </div>
    <h3 className="text-lg font-semibold text-foreground">Appointment Management</h3>
  </div>
  <Tabs ...>
    ...
  </Tabs>
</div>
```

With just:
```tsx
<Tabs ...>
  ...
</Tabs>
```

This removes the nested card entirely so tabs flow naturally inside the parent Card, eliminating the border between the title area and the tab content.
