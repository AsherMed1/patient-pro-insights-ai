
# Plan: Fix Internal Notes User Attribution Bug

## Problem

When users add internal notes on patient records, the note shows the **project name** (e.g., "Ozark Regional Vein and Artery Center") instead of the **user's name** who created the note.

### Root Cause

In `src/components/appointments/AppointmentNotes.tsx` at line 24:

```typescript
const success = await addNote(newNote, projectName);  // Bug!
```

The component passes `projectName` to the `addNote` function as the `createdBy` parameter, when it should pass the logged-in user's name.

---

## Solution

Use the existing `useUserAttribution` hook to get the current user's name and pass that to the `addNote` function instead of `projectName`.

### Changes to `src/components/appointments/AppointmentNotes.tsx`:

1. Import `useUserAttribution` hook
2. Call the hook to get `userName` 
3. Replace `projectName` with `userName` in the `addNote` call
4. Optionally disable the "Add Note" button until user attribution is loaded

### Code Changes:

```typescript
// Add import
import { useUserAttribution } from '@/hooks/useUserAttribution';

// Inside component
const { userName, isLoaded: userLoaded } = useUserAttribution();

// Fix the handleAddNote function
const handleAddNote = async () => {
  if (!newNote.trim()) return;
  
  const success = await addNote(newNote, userName);  // Fixed!
  if (success) {
    setNewNote('');
    setShowAddForm(false);
  }
};
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/appointments/AppointmentNotes.tsx` | Import `useUserAttribution`, use `userName` instead of `projectName` for note attribution |

---

## Expected Outcome

After this fix:
- New notes will show the actual user's name (e.g., "John Smith" or their email if no name is set)
- Existing notes will retain their original `created_by` value (no retroactive change)
- System-generated notes will continue to show "System" as before

---

## Note

The `projectName` prop can remain on the component for other potential uses, but it will no longer be used for note attribution.
