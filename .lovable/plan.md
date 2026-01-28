
# Plan: Add "Procedure Not Covered" Option to Clinic Procedure Status

## Problem Summary

The current `procedure_ordered` field is a boolean (`true`/`false`/`null`) that only supports 3 states:
- `null` → Not Set
- `true` → Procedure Ordered
- `false` → No Procedure

You need 4 options:
1. Not Set
2. Procedure Ordered
3. No Procedure Ordered
4. Procedure Not Covered

## Solution

Add a new text-based `procedure_status` column to support all 4 states, then update all UI components to use it.

**New column values:**
- `null` → "Not Set"
- `'ordered'` → "Procedure Ordered"
- `'no_procedure'` → "No Procedure Ordered"
- `'not_covered'` → "Procedure Not Covered"

---

## Technical Changes

### 1. Database Migration

Create a new migration to add `procedure_status` column:

```sql
-- Add procedure_status column
ALTER TABLE all_appointments 
ADD COLUMN procedure_status TEXT DEFAULT NULL;

-- Migrate existing data from procedure_ordered boolean
UPDATE all_appointments 
SET procedure_status = CASE 
  WHEN procedure_ordered = true THEN 'ordered'
  WHEN procedure_ordered = false THEN 'no_procedure'
  ELSE NULL
END;
```

### 2. Update Filter Dropdown - `src/components/appointments/AppointmentFilters.tsx`

Update lines 292-305 to use new procedure_status values:

```typescript
<Select value={procedureOrderFilter} onValueChange={onProcedureOrderFilterChange}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="All Procedures" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="ALL">All Procedures</SelectItem>
    <SelectItem value="ordered">Procedure Ordered</SelectItem>
    <SelectItem value="no_procedure">No Procedure Ordered</SelectItem>
    <SelectItem value="not_covered">Procedure Not Covered</SelectItem>
    <SelectItem value="null">Not Set</SelectItem>
  </SelectContent>
</Select>
```

### 3. Update Appointment Card Dropdown - `src/components/appointments/AppointmentCard.tsx`

Update the procedure dropdown (lines 1437-1457) to use new values:

```typescript
<Select 
  value={appointment.procedure_status || 'null'} 
  onValueChange={(value) => {
    onUpdateProcedure(appointment.id, value === 'null' ? null : value);
  }}
>
  <SelectTrigger className={getProcedureTriggerClass()}>
    <SelectValue placeholder="Select procedure status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="null">Not Set</SelectItem>
    <SelectItem value="ordered">Procedure Ordered</SelectItem>
    <SelectItem value="no_procedure">No Procedure Ordered</SelectItem>
    <SelectItem value="not_covered">Procedure Not Covered</SelectItem>
  </SelectContent>
</Select>
```

Also update the badge display (lines 1342-1345):

```typescript
{appointment.procedure_status && (
  <Badge variant={getProcedureStatusVariant(appointment.procedure_status)}>
    {getProcedureStatusLabel(appointment.procedure_status)}
  </Badge>
)}
```

Add helper functions:
```typescript
const getProcedureStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'ordered': 'Procedure Ordered',
    'no_procedure': 'No Procedure Ordered',
    'not_covered': 'Procedure Not Covered'
  };
  return labels[status] || status;
};

const getProcedureStatusVariant = (status: string) => {
  const variants: Record<string, string> = {
    'ordered': 'default',
    'no_procedure': 'secondary',
    'not_covered': 'destructive'
  };
  return variants[status] || 'outline';
};
```

### 4. Update Filtering Logic - `src/components/AllAppointmentsManager.tsx`

Update procedure filter logic (lines 248-256, 384-392, 518-526) to use text matching:

```typescript
// Apply procedure status filter
if (procedureOrderFilter !== 'ALL') {
  if (procedureOrderFilter === 'null') {
    query = query.is('procedure_status', null);
  } else {
    query = query.eq('procedure_status', procedureOrderFilter);
  }
}
```

### 5. Update Type Definitions - `src/integrations/supabase/types.ts`

The types will auto-update when you regenerate from Supabase after the migration runs.

---

## Files to Modify

| File | Change |
|------|--------|
| Database migration | Add `procedure_status` text column |
| `src/components/appointments/AppointmentFilters.tsx` | Update filter dropdown options |
| `src/components/appointments/AppointmentCard.tsx` | Update card dropdown, badge display, and helper functions |
| `src/components/AllAppointmentsManager.tsx` | Update filtering logic to use text matching |
| `src/pages/ProjectPortal.tsx` | Update initialProcedureFilter values |

---

## Expected Outcome

After implementation:
- Filter dropdown shows: All Procedures, Procedure Ordered, No Procedure Ordered, Procedure Not Covered, Not Set
- Appointment card dropdown shows the same 4 options
- Badges display with appropriate colors (green for ordered, gray for no procedure, red for not covered)
- Existing data is migrated: `true` → 'ordered', `false` → 'no_procedure'
