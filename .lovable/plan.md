
## Add Delete Button for Reserved Time Blocks

### Overview

Reserved time blocks need a delete button so users can remove them from both the local database and GoHighLevel when they're no longer needed. The delete functionality will:

1. Show a delete button only for reserved blocks (not regular appointments)
2. Delete the block from GoHighLevel using the existing `delete-ghl-appointment` edge function
3. Delete the local record from the `all_appointments` table
4. Refresh the calendar view to reflect the change

---

### Part 1: Update DetailedAppointmentView Component

**File:** `src/components/appointments/DetailedAppointmentView.tsx`

Add delete functionality specifically for reserved blocks:

1. Add state for delete confirmation and loading
2. Add a delete handler function that:
   - Calls the `delete-ghl-appointment` edge function
   - Deletes the local database record
   - Shows success/error toast
   - Closes the modal and triggers refresh
3. Add a delete button in the dialog header (only visible for reserved blocks)
4. Add an AlertDialog for delete confirmation

```typescript
// New state variables
const [isDeleting, setIsDeleting] = useState(false);

// New prop for refresh callback
interface DetailedAppointmentViewProps {
  // ... existing props
  onDataRefresh?: () => void;
  onDeleted?: () => void;  // NEW: Callback after deletion
}

// Delete handler
const handleDeleteReservedBlock = async () => {
  setIsDeleting(true);
  try {
    // Delete from GHL if has appointment ID
    if (appointment.ghl_appointment_id) {
      await supabase.functions.invoke('delete-ghl-appointment', {
        body: {
          project_name: appointment.project_name,
          ghl_appointment_id: appointment.ghl_appointment_id
        }
      });
    }
    
    // Delete from local database
    await supabase
      .from('all_appointments')
      .delete()
      .eq('id', appointment.id);
    
    toast.success('Reserved time block deleted');
    onClose();
    onDeleted?.();
  } catch (error) {
    toast.error('Failed to delete time block');
  } finally {
    setIsDeleting(false);
  }
};
```

UI addition (in dialog header, next to Print button):
```tsx
{appointment.is_reserved_block && (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive" size="sm" disabled={isDeleting}>
        <Trash2 className="h-4 w-4 mr-2" />
        {isDeleting ? 'Deleting...' : 'Delete Block'}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Reserved Time Block?</AlertDialogTitle>
        <AlertDialogDescription>
          This will remove the time block from both this portal and GoHighLevel. 
          The calendar slot will become available for booking again.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={handleDeleteReservedBlock}>
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}
```

---

### Part 2: Update ProjectPortal to Handle Deletion

**File:** `src/pages/ProjectPortal.tsx`

Pass a deletion callback to trigger calendar refresh:

```tsx
<DetailedAppointmentView
  appointment={selectedAppointment}
  isOpen={!!selectedAppointment}
  onClose={() => setSelectedAppointment(null)}
  onDeleted={() => {
    setSelectedAppointment(null);
    setCalendarRefreshKey(prev => prev + 1);
  }}
/>
```

Also pass the `key` prop to `CalendarDetailView` to force refresh:

```tsx
<CalendarDetailView
  key={calendarRefreshKey}  // ADD THIS
  projectName={project.project_name}
  // ... other props
/>
```

---

### Part 3: Add Visual Indicator in Calendar Views

**File:** `src/components/appointments/CalendarDayView.tsx`

Add a small delete icon hint on reserved blocks to indicate they can be deleted:

```tsx
{isReserved && <Lock className="h-3 w-3 text-slate-500 flex-shrink-0" />}
// The Lock icon already indicates it's a reserved block
// Clicking opens the detail view where delete is available
```

No additional changes needed here - the existing click handler opens DetailedAppointmentView where delete is available.

---

### Files Changed

| File | Change |
|------|--------|
| `src/components/appointments/DetailedAppointmentView.tsx` | Add delete button, confirmation dialog, and delete handler for reserved blocks |
| `src/pages/ProjectPortal.tsx` | Pass `onDeleted` callback and add refresh key to CalendarDetailView |

---

### User Flow

1. User sees a reserved time block in the calendar (indicated by Lock icon and gray styling)
2. User clicks the block to open the detail view
3. User sees a red "Delete Block" button (only visible for reserved blocks)
4. User clicks "Delete Block" and sees a confirmation dialog
5. User confirms deletion
6. System deletes from GHL (using existing edge function) and local database
7. Modal closes and calendar refreshes to show the slot is now available

---

### Technical Notes

- The existing `delete-ghl-appointment` edge function already handles GHL deletion correctly
- Reserved blocks are identified by `is_reserved_block === true`
- The delete button only appears for reserved blocks, not regular patient appointments
- Calendar refresh is triggered via the `calendarRefreshKey` state increment pattern already used for creation
