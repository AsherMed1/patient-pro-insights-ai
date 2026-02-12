

# Enhance Internal Notes with Old and New Values

## Problem

When a status (or other field) is updated from the calendar detail view, the internal note says:
"Portal update by Jenny S: Updated status"

It should say:
"Portal update by Jenny S: Updated status from "Confirmed" to "Scheduled"

## Changes

### 1. `src/components/appointments/DetailedAppointmentView.tsx`

Pass the previous values to the edge function so it can build a descriptive note. When calling `update-appointment-fields`, include a new `previousValues` object containing the old values for any fields being changed.

For example, when status changes from "Confirmed" to "Scheduled":
- `updates`: `{ status: "Scheduled" }`
- `previousValues`: `{ status: "Confirmed" }`

This applies to all fields updated via `handleFieldUpdate` -- status, procedure_status, and any other inline edits.

### 2. `supabase/functions/update-appointment-fields/index.ts`

- Accept the new `previousValues` parameter from the request body
- Update the note text generation (line 55) to include old and new values:
  - For each changed field, format as: `Updated {field} from "{oldValue}" to "{newValue}"`
  - If no previous value is available, fall back to: `Updated {field} to "{newValue}"`
  - Multiple fields joined with `, `

Example output:
`Portal update by Jenny S: Updated status from "Confirmed" to "Scheduled"`

### Result

Internal notes will clearly show what changed, making the audit trail more informative and matching the format used elsewhere in the system.

