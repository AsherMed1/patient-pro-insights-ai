
# Plan: Fix Service Type Update Detection for Medical Information

## Problem Summary

Patient Cassandra Evans was originally a GAE patient who later opted for UFE service. While the portal correctly shows "UFE Consultation at Macon, GA" (from the calendar), the Medical Information section still displays the old GAE pathology data (knee pain, OA diagnosis, etc.) instead of UFE-specific information (pelvic pain, menstrual symptoms, fibroids).

The core issue is that the AI parsing system:
1. Extracts only ONE procedure type when multiple exist in intake notes
2. Doesn't prioritize the LATEST procedure data when a patient changes services
3. Preserves old pathology data even when new service-specific data is available

---

## Technical Analysis

### Current State (from database query)

The `patient_intake_notes` field contains BOTH:
- **GAE data** (lines 27-37): Knee pain, OA diagnosis, 8/10 pain, medications tried
- **UFE data** (lines 73-80): Pelvic pain frequency, period patterns, heavy bleeding, urinary symptoms

But `parsed_pathology_info` only contains GAE:
```json
{
  "procedure_type": "GAE",
  "primary_complaint": "knee pain",
  "pain_level": "8",
  "symptoms": "Sharp Pain, Instability or weakness, Stiffness"
  // ...all knee-related data
}
```

### Root Causes

1. **Single procedure_type field in AI prompt schema** - The parser returns only one procedure type, picking whichever appears first or most prominently

2. **No "latest service" detection** - When GHL custom fields are updated for a new procedure (UFE), the system appends data but doesn't recognize the SERVICE CHANGE pattern

3. **Calendar name not used for procedure detection** - The appointment's calendar ("Request your UFE Consultation at Macon, GA") indicates UFE, but this isn't used to guide pathology extraction

---

## Solution

### Phase 1: Use Calendar Name to Determine Primary Procedure

Update the `auto-parse-intake-notes` edge function to:

1. **Pass calendar/location context to the AI prompt** - Include the appointment's calendar name so the AI knows which procedure to prioritize

2. **Update AI prompt to prefer the active procedure** - When the calendar indicates UFE but notes contain both GAE and UFE data, extract UFE-specific pathology

### Changes to `supabase/functions/auto-parse-intake-notes/index.ts`:

**Step 1: Fetch calendar name from appointment**

Add to the appointment query (around line 555):
```typescript
.select("id, patient_intake_notes, lead_name, project_name, created_at, dob, 
         parsed_demographics, parsed_contact_info, ghl_id, ghl_appointment_id,
         ghl_calendar_name, date_of_appointment")
```

**Step 2: Detect procedure from calendar name**

Add helper function to detect procedure type from calendar:
```typescript
function detectProcedureFromCalendar(calendarName: string | null): string | null {
  if (!calendarName) return null;
  const name = calendarName.toLowerCase();
  
  if (name.includes('ufe') || name.includes('fibroid') || name.includes('uterine')) {
    return 'UFE';
  }
  if (name.includes('pae') || name.includes('prostate')) {
    return 'PAE';
  }
  if (name.includes('gae') || name.includes('knee') || name.includes('osteoarthritis')) {
    return 'GAE';
  }
  return null;
}
```

**Step 3: Update AI system prompt to include procedure context**

When a procedure is detected from the calendar, add guidance to the system prompt:
```typescript
let procedureContext = '';
const calendarProcedure = detectProcedureFromCalendar(record.ghl_calendar_name);
if (calendarProcedure) {
  procedureContext = `
IMPORTANT: This patient's current appointment is for a ${calendarProcedure} consultation.
If the notes contain information for multiple procedures (e.g., both GAE and UFE), 
extract and prioritize the ${calendarProcedure}-specific pathology data.

${calendarProcedure === 'UFE' ? 'UFE (Uterine Fibroid Embolization) symptoms include: pelvic pain, heavy periods, menstrual issues, urinary symptoms, pain during intercourse.' : ''}
${calendarProcedure === 'PAE' ? 'PAE (Prostatic Artery Embolization) symptoms include: urinary frequency, weak stream, incomplete emptying, nocturia.' : ''}
${calendarProcedure === 'GAE' ? 'GAE (Genicular Artery Embolization) symptoms include: knee pain, osteoarthritis, stiffness, swelling, joint instability.' : ''}
`;
}
```

**Step 4: Include procedure context in the user prompt**

```typescript
const userPrompt = `${procedureContext}

Patient Intake Notes:

${record.patient_intake_notes}`;
```

---

### Phase 2: Add Manual "Reparse" Button to UI (Optional Enhancement)

Add a button in the Patient Pro Insights section to manually trigger re-parsing when users notice stale data.

**File: `src/components/appointments/ParsedIntakeInfo.tsx`**

Add a "Refresh Data" button that calls `reparse-specific-appointments` with the current appointment ID.

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/auto-parse-intake-notes/index.ts` | Modify | Add calendar-based procedure detection and context to AI prompt |
| `src/components/appointments/ParsedIntakeInfo.tsx` | Modify | Add optional "Reparse" button for manual refresh |

---

## Immediate Fix for Cassandra Evans

After deploying the updated edge function:

1. Reset `parsing_completed_at` to NULL for this appointment
2. Trigger `auto-parse-intake-notes` to re-parse with the new logic

This can be done via a simple SQL update or by calling the `reparse-specific-appointments` edge function with her appointment ID: `e8f9c5d6-b3a2-4e8f-9d1a-7c6e5f4a3b2c`

---

## Expected Outcome

After this fix:
- **Cassandra Evans' Medical Information** will show UFE-specific data:
  - Pathology: UFE
  - Primary Complaint: Pelvic pain/cramping, Heavy periods
  - Symptoms: Heavy bleeding, urinary urgency, pain during intercourse
  - Duration: Based on UFE intake responses

- **Future service changes** will automatically use the current calendar context to extract the correct procedure-specific pathology

---

## Testing

1. Deploy updated `auto-parse-intake-notes` function
2. Call `reparse-specific-appointments` with Cassandra Evans' appointment ID
3. Verify Medical Information section now shows UFE data
4. Test with other patients who have switched services
