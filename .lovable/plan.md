

# Plan: Add Editable Email Field with "-" Placeholder

## Problem

When patients don't have an email address, the email field is hidden entirely. Clinic staff need to:
1. See that no email exists (display "-" placeholder)
2. Be able to add/edit the email address

## Solution

Update the Contact Information section in `ParsedIntakeInfo.tsx` to:
1. Always display the Email row (with "-" when empty)
2. Add a pencil icon to enable editing
3. Save changes to `parsed_contact_info.email` via the existing `update-appointment-fields` edge function

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/appointments/ParsedIntakeInfo.tsx` | Add Contact Info editing capability for email |

---

## Implementation Details

### 1. Add Contact Edit State Variables (near line 87)

```typescript
// Contact edit state
const [isEditingContact, setIsEditingContact] = useState(false);
const [isSavingContact, setIsSavingContact] = useState(false);
const [editEmail, setEditEmail] = useState("");
```

### 2. Add Contact Edit Handlers (after PCP handlers, around line 265)

```typescript
// Contact edit handlers
const handleStartEditContact = () => {
  setEditEmail(formatValue(parsedContactInfo?.email) || "");
  setIsEditingContact(true);
};

const handleCancelEditContact = () => {
  setIsEditingContact(false);
};

const handleSaveContact = async () => {
  if (!appointmentId) {
    toast({
      title: "Error",
      description: "Cannot save: appointment ID is missing",
      variant: "destructive",
    });
    return;
  }

  setIsSavingContact(true);
  try {
    const updatedContactInfo = {
      ...(parsedContactInfo || {}),
      email: editEmail || null,
    };

    const { error } = await supabase.functions.invoke('update-appointment-fields', {
      body: {
        appointmentId,
        updates: { parsed_contact_info: updatedContactInfo },
        userId,
        userName,
        changeSource: 'portal'
      }
    });

    if (error) throw error;

    toast({
      title: "Success",
      description: "Contact information updated",
    });

    setIsEditingContact(false);
    onUpdate?.();
  } catch (error) {
    console.error('Error saving contact:', error);
    toast({
      title: "Error",
      description: "Failed to save contact information",
      variant: "destructive",
    });
  } finally {
    setIsSavingContact(false);
  }
};
```

### 3. Update Contact Information Card (lines 373-401)

**Before:**
```tsx
{parsedContactInfo && (
  <Card className="bg-blue-50 border-blue-200">
    <CardContent className="pt-4 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Phone className="h-4 w-4 text-blue-600" />
        <span className="font-medium text-sm text-blue-900">Contact Information</span>
      </div>
      {formatValue(parsedContactInfo.email) && (
        <div className="text-sm">
          <span className="text-muted-foreground">Email:</span>{" "}
          <span className="font-medium">{parsedContactInfo.email}</span>
        </div>
      )}
      ...
    </CardContent>
  </Card>
)}
```

**After:**
```tsx
{parsedContactInfo && (
  <Card className="bg-blue-50 border-blue-200">
    <CardContent className="pt-4 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-sm text-blue-900">Contact Information</span>
        </div>
        {appointmentId && !isEditingContact && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
            onClick={(e) => {
              e.stopPropagation();
              handleStartEditContact();
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {isEditingContact && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
              onClick={handleSaveContact}
              disabled={isSavingContact}
            >
              {isSavingContact ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleCancelEditContact}
              disabled={isSavingContact}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {isEditingContact ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Email</label>
            <Input
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="Email address"
              type="email"
              className="h-8 text-sm bg-background"
            />
          </div>
        </div>
      ) : (
        <>
          {formatValue(parsedContactInfo.dob) && (
            <div className="text-sm">
              <span className="text-muted-foreground">Date of Birth:</span>{" "}
              <span className="font-medium">{parsedContactInfo.dob}</span>
            </div>
          )}
          {/* Email - always show with "-" fallback */}
          <div className="text-sm">
            <span className="text-muted-foreground">Email:</span>{" "}
            <span className="font-medium">{formatValue(parsedContactInfo.email) || "—"}</span>
          </div>
          {formatValue(parsedContactInfo.address) && (
            <div className="text-sm">
              <span className="text-muted-foreground">Address:</span>{" "}
              <span className="font-medium">{parsedContactInfo.address}</span>
            </div>
          )}
        </>
      )}
    </CardContent>
  </Card>
)}
```

---

## User Experience

| Scenario | Before | After |
|----------|--------|-------|
| Patient has no email | Email row hidden | Shows "Email: —" with edit pencil |
| Staff wants to add email | Not possible | Click pencil, type email, save |
| Staff wants to edit email | Not possible | Click pencil, modify, save |

---

## Consistency

This implementation follows the exact same pattern used for:
- Insurance Information editing (green card, lines 403-560)
- Medical & PCP Information editing (lines 570+)

All three cards will now have consistent edit functionality with pencil icons.

