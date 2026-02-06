

# Plan: Fix Phone Number Display in Appointment Cards

## Problem

The patient's phone number is not displaying in the main appointment card view (list view), but appears correctly when clicking "View Details". The database confirms the phone number exists (`(210) 216-2406` for Theresa Haschke), but it's not being rendered in the card.

## Root Cause Analysis

Comparing the two components:

**AppointmentCard.tsx (main view):**
```tsx
// Line 1218 - Phone is CONDITIONALLY rendered
{(appointment.lead_phone_number || isEditingPhone) && (
  // ... phone display
)}
```

**DetailedAppointmentView.tsx (modal):**
```tsx
// Line 419 - Phone uses fallback logic
{(appointment.lead_phone_number || leadDetails?.phone_number) && (
  // ... phone display with leadDetails fallback
)}
```

The main card view only shows the phone if `lead_phone_number` is directly available on the appointment object. If there's any delay in data loading or if the phone comes from a different source (like `parsed_contact_info`), it won't display.

Additionally, email always shows with a dash fallback:
```tsx
<span className="text-sm text-gray-600 break-all">{appointment.lead_email || '—'}</span>
```

But phone doesn't have this consistent behavior.

---

## Solution

Update `AppointmentCard.tsx` to:

1. Always display the phone field (like email) instead of conditionally hiding it
2. Add fallback logic to check multiple sources for phone number:
   - `appointment.lead_phone_number`
   - `appointment.parsed_contact_info?.phone`
3. Show a dash ("—") when no phone is available (matching email behavior)

---

## Technical Changes

### File: `src/components/appointments/AppointmentCard.tsx`

**1. Add a computed phone number variable with fallback logic:**

Near the existing `dobDisplay` computed variable (around line 108), add:

```tsx
// Prefer lead_phone_number, fallback to parsed_contact_info phone
const phoneDisplay = appointment.lead_phone_number || 
                     (appointment as any).parsed_contact_info?.phone || 
                     null;
```

**2. Update the phone rendering section (lines 1218-1274):**

Change from conditionally rendering to always rendering (like email):

Before:
```tsx
{(appointment.lead_phone_number || isEditingPhone) && (
  <TooltipProvider>
    ...
  </TooltipProvider>
)}
```

After:
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="flex items-center space-x-2">
        <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
        {isEditingPhone && onUpdatePhone ? (
          <Input ... />
        ) : (
          <>
            <span className="text-sm text-gray-600">
              {phoneDisplay || '—'}
            </span>
            {onUpdatePhone && (
              <Button ... />
            )}
          </>
        )}
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <p>Phone Number</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**3. Update the editing state initialization (line 120):**

```tsx
const [editingPhone, setEditingPhone] = useState(phoneDisplay || '');
```

**4. Update the useEffect sync (line 376):**

```tsx
setEditingPhone(phoneDisplay || '');
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/appointments/AppointmentCard.tsx` | Add `phoneDisplay` variable with fallback logic, always render phone field like email |

---

## Summary

This fix ensures phone numbers are always visible in the appointment card view by:
1. Adding fallback logic to check multiple data sources for the phone number
2. Always displaying the phone field (with dash fallback when empty) for consistency with email
3. Using a computed `phoneDisplay` variable to centralize the fallback logic

