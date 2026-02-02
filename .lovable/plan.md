
# Plan: Always Show Email Field with "-" Placeholder in Appointment Card

## Problem

The email field in the AppointmentCard is only displayed when `appointment.lead_email` has a value. If a patient has no email, the field is completely hidden - users can't see it's missing or add one.

From the screenshot, you can see the phone number `(352) 602-9265` with a pencil icon, but there's no email row visible for Charles Hayes.

---

## Solution

Modify the conditional rendering to always show the email row:
1. Remove the condition that hides the email field when empty
2. Display "—" when email is null/empty
3. Keep the existing pencil icon and editing functionality

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/appointments/AppointmentCard.tsx` | Always show email row with "-" fallback |

---

## Implementation Details

### Current Code (Line 1162)

```tsx
{(appointment.lead_email || isEditingEmail) && (
  <TooltipProvider>
    ...
    <span className="text-sm text-gray-600 break-all">{appointment.lead_email}</span>
    ...
  </TooltipProvider>
)}
```

### Updated Code

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="flex items-start space-x-2">
        <Mail className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
        {isEditingEmail && onUpdateEmail ? (
          <Input
            type="email"
            value={editingEmail}
            onChange={(e) => setEditingEmail(e.target.value)}
            onBlur={() => {
              setIsEditingEmail(false);
              if (editingEmail !== appointment.lead_email) {
                onUpdateEmail(appointment.id, editingEmail);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsEditingEmail(false);
                if (editingEmail !== appointment.lead_email) {
                  onUpdateEmail(appointment.id, editingEmail);
                }
              }
              if (e.key === 'Escape') {
                setIsEditingEmail(false);
                setEditingEmail(appointment.lead_email || '');
              }
            }}
            className="text-sm flex-1"
            autoFocus
            placeholder="Enter email"
          />
        ) : (
          <>
            <span className="text-sm text-gray-600 break-all">
              {appointment.lead_email || "—"}
            </span>
            {onUpdateEmail && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsEditingEmail(true)}
                aria-label="Edit email"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </>
        )}
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <p>Email Address</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## Changes Summary

| Line | Before | After |
|------|--------|-------|
| 1162 | `{(appointment.lead_email || isEditingEmail) && (` | Remove conditional wrapper entirely |
| 1197 | `{appointment.lead_email}` | `{appointment.lead_email || "—"}` |

---

## Expected Behavior

| Scenario | Before | After |
|----------|--------|-------|
| Patient has email | Shows email with pencil | Same - no change |
| Patient has no email | **Row hidden entirely** | Shows "—" with pencil icon |
| Click pencil when no email | Not possible | Opens input to add email |

---

## Visual Result

**Before (Charles Hayes):**
```
📞 (352) 602-9265 ✏️
📅 Created: Jan 30, 2026...
```

**After (Charles Hayes):**
```
✉️ — ✏️
📞 (352) 602-9265 ✏️
📅 Created: Jan 30, 2026...
```
