

# Plan: Reposition Status, Procedure, and Notes in Appointment Detail View

## Overview

Rearrange the layout of the Appointment Detail dialog so that **Status**, **Procedure**, and **Notes** appear in the same positions as shown in the reference image -- a horizontal action row right below the Appointment Overview content, before the Patient Intake Notes section.

## Current Layout

```text
Appointment Overview Card
  [Left Column: Name, Phone, Email, Address, Project]
  [Right Column: Date, Time, Status dropdown, Procedure dropdown, Agent]
  [Insurance Button]

Patient Intake Notes Card
...
Internal Notes Card (at bottom)
```

## New Layout (matching the reference image)

```text
Appointment Overview Card
  [Left Column: Name, Phone, Email, Address, Project]
  [Right Column: Date, Time, Calendar/Service, Agent]

Action Row: [View Insurance] [Status dropdown] [Procedure dropdown]
Notes Row:  [Internal Notes - inline/compact]

Patient Intake Notes Card
...
```

## Technical Details

### File: `src/components/appointments/DetailedAppointmentView.tsx`

1. **Remove Status and Procedure dropdowns** from the right column of the grid (lines ~554-601) -- they currently sit between the Time tooltip and the Agent tooltip.

2. **Create a new action row** after the Appointment Overview card's `</CardContent>` but still inside the card (or right after it). This row contains three items side by side:
   - "View Insurance Information" button (moved from its current position at line ~622)
   - Status `Select` dropdown
   - Procedure Status `Select` dropdown

3. **Move Internal Notes** from its standalone Card at the bottom (lines ~723-735) to a compact section directly below the action row, still before the Patient Intake Notes card. This will be rendered without the heavy Card wrapper -- just a label and the `AppointmentNotes` component.

4. **Keep the calendar name** in the right column where Status used to be, showing it with the Hash icon (currently Status uses Hash -- we can keep Hash for calendar/service type display).

### Layout Structure

```text
<Card> Appointment Overview
  <grid>
    left: Name, Phone, Email, Address, Project
    right: Date, Time, Calendar Name, Agent
  </grid>
</Card>

<div className="flex flex-wrap items-center gap-3">
  [Insurance Button]  [Status Select]  [Procedure Select]  [Loader if updating]
</div>

<div> Internal Notes (compact, no Card wrapper)
  <AppointmentNotes ... />
</div>

<Card> Patient Intake Notes ... </Card>
```

### No New Files or Dependencies

All changes are within `DetailedAppointmentView.tsx` -- just moving existing elements into a new arrangement.

