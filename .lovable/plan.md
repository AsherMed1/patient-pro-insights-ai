
# Plan: Filter Raw Intake Notes to Show Only Current Procedure Data

## Problem

When a patient originally came in for one procedure (UFE) but later schedules a different procedure (GAE), the raw `patient_intake_notes` field contains pathology data for BOTH procedures. This confuses clinic staff who cannot tell if the patient needs one or both treatments.

**Screenshot shows:**
- UFE STEP 1 fields (pelvic pain, heavy periods, period length)
- GAE STEP 1/2 fields (knee osteoarthritis, knee pain duration, imaging)

The patient is ONLY doing GAE, but the UI displays UFE data too.

## Root Cause Analysis

1. **Raw notes are cumulative**: Each time GHL data is fetched, it appends to `patient_intake_notes`
2. **Parser filters correctly**: The `auto-parse-intake-notes` function already filters by procedure when building structured data
3. **UI displays raw notes unfiltered**: The `DetailedAppointmentView` component shows the raw `patient_intake_notes` text as-is

## Solution: Filter Raw Notes Display in UI

Add a utility function to filter the raw intake notes text to only show pathology data relevant to the current appointment's calendar/procedure type, while keeping all other sections (Contact, Insurance, Medical) intact.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/appointments/DetailedAppointmentView.tsx` | Add procedure-aware filtering for raw notes display |

---

## Implementation Details

### Step 1: Create Filter Function

Add a helper function that:
1. Detects the current procedure from `calendar_name` (GAE, UFE, PAE, PFE)
2. Filters lines in the Pathology Information section that contain STEP prefixes for OTHER procedures
3. Keeps all non-pathology content (Contact, Insurance, Medical)

```typescript
const filterIntakeNotesByProcedure = (notes: string, calendarName: string | null): string => {
  if (!notes || !calendarName) return notes;
  
  // Detect procedure from calendar name
  const lowerCalendar = calendarName.toLowerCase();
  let currentProcedure: string | null = null;
  
  if (lowerCalendar.includes('gae') || lowerCalendar.includes('knee')) {
    currentProcedure = 'GAE';
  } else if (lowerCalendar.includes('ufe') || lowerCalendar.includes('fibroid')) {
    currentProcedure = 'UFE';
  } else if (lowerCalendar.includes('pae') || lowerCalendar.includes('prostate')) {
    currentProcedure = 'PAE';
  } else if (lowerCalendar.includes('pfe') || lowerCalendar.includes('pelvic floor')) {
    currentProcedure = 'PFE';
  }
  
  if (!currentProcedure) return notes;
  
  // Filter lines - remove STEP data from other procedures
  const lines = notes.split('\n');
  const filteredLines = lines.filter(line => {
    const upperLine = line.toUpperCase();
    
    // Check if this is a STEP line from a different procedure
    const stepProcedures = ['GAE', 'UFE', 'PAE', 'PFE'];
    for (const proc of stepProcedures) {
      if (proc !== currentProcedure && upperLine.includes(`${proc} STEP`)) {
        return false; // Skip lines from other procedures
      }
    }
    return true;
  });
  
  return filteredLines.join('\n');
};
```

### Step 2: Apply Filter in Notes Display

Update the notes display section to use the filtered notes:

```tsx
{/* Patient Intake Notes */}
{(appointment.patient_intake_notes || leadDetails?.patient_intake_notes) && (
  <Card className="print-card">
    ...
    <CardContent>
      <div className="prose prose-sm max-w-none">
        <div className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg border">
          {filterIntakeNotesByProcedure(
            appointment.patient_intake_notes || leadDetails?.patient_intake_notes || '',
            appointment.calendar_name
          )}
        </div>
      </div>
      ...
    </CardContent>
  </Card>
)}
```

---

## Result

After implementation:
- The raw "Patient Intake Notes" section will only display pathology STEP data for the current appointment's procedure
- For Cassandra Goolsby (GAE appointment), UFE STEP lines will be hidden
- Contact, Insurance, and Medical information remain visible
- The underlying data is unchanged - this is display-only filtering
- Staff will clearly see this is a GAE-only patient

---

## Technical Notes

- This is a **display-only change** - no database modifications
- The raw `patient_intake_notes` field still contains all historical data for reference
- The parsed structured data (`parsed_pathology_info`) is already filtered by the edge function
- This change aligns the raw notes display with the structured data behavior

