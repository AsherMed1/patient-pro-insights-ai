

# Plan: Bulk Delete Appointments

## Overview

Add a "Select Mode" toggle to the appointments list that enables checkboxes on each appointment card, allowing you to select multiple appointments and delete them all at once.

---

## How It Will Work

1. Click a **"Select"** button in the toolbar to enter selection mode
2. Checkboxes appear on each appointment card
3. Select individual appointments or use **"Select All on Page"**
4. A floating action bar shows the count of selected items with a **"Delete Selected"** button
5. Confirmation dialog before deletion proceeds
6. Appointments are deleted in batches of 50 for reliability

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/appointments/AppointmentsList.tsx` | Add selection state, checkboxes on each card, select all toggle, floating action bar with bulk delete button, and confirmation dialog |
| `src/components/AllAppointmentsManager.tsx` | Add `bulkDeleteAppointments(ids: string[])` function and pass it to `AppointmentsList` |

### New UI Elements

- **Select button** in the pagination info bar to toggle selection mode
- **Checkbox** on the left side of each `AppointmentCard` (only visible in select mode)
- **"Select All on Page"** checkbox in the header
- **Floating action bar** at bottom showing: `"X selected"` + `"Delete Selected"` button (red)
- **Confirmation dialog** with count: `"Are you sure you want to delete X appointments? This cannot be undone."`

### Bulk Delete Function (in AllAppointmentsManager)

```typescript
const bulkDeleteAppointments = async (ids: string[]) => {
  // Delete in batches of 50
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    await supabase.from('all_appointments').delete().in('id', batch);
  }
  // Refresh data
  fetchAppointments();
  fetchTabCounts();
  onDataChanged?.();
};
```

### Selection State (in AppointmentsList)

```typescript
const [selectionMode, setSelectionMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

---

## Safety Measures

- Confirmation dialog required before any bulk delete
- Dialog shows exact count of appointments to be deleted
- Exiting selection mode clears all selections
- Batch deletion (50 at a time) prevents timeouts

