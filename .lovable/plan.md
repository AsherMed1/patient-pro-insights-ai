

# Plan: Add "Imaging Ordered" Procedure Status Option

## Overview

Add a new "Imaging Ordered" status to the procedure status dropdown across the app. This is a simple tracking/reporting status with no special logic -- it works identically to the existing options like "Procedure Ordered" or "Not Covered."

## What Changes

A new value `imaging_ordered` with label **"Imaging Ordered"** will appear in every procedure status dropdown across the application.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/appointments/AppointmentCard.tsx` | Add `<SelectItem value="imaging_ordered">Imaging Ordered</SelectItem>` to the procedure status dropdown; add styling for the new value (e.g., blue tint) in `getProcedureCardClass` |
| `src/components/appointments/AppointmentFilters.tsx` | Add `<SelectItem value="imaging_ordered">Imaging Ordered</SelectItem>` to the filter dropdown |
| `src/components/appointments/DetailedAppointmentView.tsx` | Add `<SelectItem value="imaging_ordered">Imaging Ordered</SelectItem>` to the calendar detail view's procedure dropdown |
| `src/components/AllAppointmentsManager.tsx` | Update `updateProcedureOrdered` to handle the new value in the backward-compatibility mapping (map to `procedure_ordered: null` since it's not a final procedure decision) |

## No Database or Edge Function Changes

The `procedure_status` column is already a text field -- it accepts any string value. No migration needed. The `update-appointment-fields` edge function writes arbitrary field values, so it handles this automatically.

## Visual Styling

The "Imaging Ordered" option will use a blue/indigo card highlight (e.g., `bg-blue-50 border-blue-200`) to visually distinguish it from green (Procedure Ordered), red (Not Covered), and gray (No Procedure).

