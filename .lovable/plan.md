

# Fix Contact Information Edit Mode - Show All Fields

## Problem
When clicking the edit (pencil) icon on the Contact Information card, only the Email field appears as editable. The Date of Birth and Address fields disappear entirely. This means clinic users like Ozark cannot edit DOB or Address through this section.

## Solution
Expand the Contact Information edit mode to include all displayed fields: Date of Birth, Email, Phone, and Address. Also update the save handler to persist all these fields.

## Changes

### 1. Add state variables for new editable fields
Add `editDOB`, `editAddress`, and `editPhone` state variables alongside the existing `editEmail`.

### 2. Update `handleStartEditContact` to initialize all fields
Pre-populate DOB, Address, and Phone from the current `parsedContactInfo` values when entering edit mode.

### 3. Expand the edit form UI
Replace the email-only edit form with inputs for:
- Date of Birth (text input, format: YYYY-MM-DD or MM/DD/YYYY)
- Phone (tel input)
- Email (email input)
- Address (text input)

### 4. Update `handleSaveContact` to save all fields
Update the save handler to include all edited fields in the `parsed_contact_info` update, and also update the top-level `dob` and `lead_email` columns for consistency:

```typescript
const updatedContactInfo = {
  ...(parsedContactInfo || {}),
  email: editEmail || null,
  dob: editDOB || null,
  phone: editPhone || null,
  address: editAddress || null,
};

updates: {
  parsed_contact_info: updatedContactInfo,
  lead_email: editEmail || null,
  dob: editDOB || null,
}
```

### File Modified
- `src/components/appointments/ParsedIntakeInfo.tsx` -- add state, update handlers, expand edit form UI

