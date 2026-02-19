
# Fix "Oldest to Newest" Sort Not Working on the New Tab

## Root Cause

In `src/components/AllAppointmentsManager.tsx` at lines 328-330, the "New" tab has a hardcoded sort override:

```typescript
// Sort by newest first on the "New" tab using full timestamp
if (activeTab === 'new') {
  appointmentsQuery = appointmentsQuery.order('created_at', { ascending: false });
}
```

This completely ignores the user's chosen sort option (`sortBy` state). No matter what the user selects from the sort dropdown — "Oldest First", "Name A-Z", etc. — the "New" tab always reverts to newest-first by `created_at`. The other tabs (Needs Review, Upcoming, Completed) correctly respect the `sortBy` state.

## Fix

Remove the hardcoded sort for the "New" tab and apply the same user-driven sort logic that all other tabs use. The default sort will remain "Newest First" (`date_desc`) since that is the default value of `sortBy`.

### Before
```typescript
if (activeTab === 'new') {
  appointmentsQuery = appointmentsQuery.order('created_at', { ascending: false });
} else {
  // Apply user-selected sorting for ALL views
  if (sortBy === 'name_asc' || sortBy === 'name_desc') { ... }
  else if (sortBy === 'date_asc' || sortBy === 'date_desc') { ... }
  else { ... }
}
```

### After
```typescript
// Apply user-selected sorting for ALL tabs (including "new")
if (sortBy === 'name_asc' || sortBy === 'name_desc') {
  appointmentsQuery = appointmentsQuery.order('lead_name', { ascending: sortBy === 'name_asc', nullsFirst: false });
} else if (sortBy === 'date_asc' || sortBy === 'date_desc') {
  const sortColumn = dateFilterType === 'created' ? 'created_at' : 'date_of_appointment';
  appointmentsQuery = appointmentsQuery.order(sortColumn, { ascending: sortBy === 'date_asc', nullsFirst: false });
} else {
  appointmentsQuery = appointmentsQuery.order(
    sortBy === 'procedure_ordered' ? 'procedure_ordered' :
    sortBy === 'project' ? 'project_name' : 'created_at',
    { ascending: sortBy === 'project' ? true : false, nullsFirst: sortBy === 'procedure_ordered' ? false : true }
  );
}
```

## Why This Is Safe

- The default value of `sortBy` is `'date_desc'` (Newest First), so the default behavior on the New tab remains unchanged — users will still see newest appointments first by default.
- All other tabs already use this same sort block and it works correctly there.
- The fix simply removes the special-casing that was preventing the New tab from respecting the user's sort choice.

## File Changed

- `src/components/AllAppointmentsManager.tsx` — remove the `if (activeTab === 'new')` sort override (lines 328-345), replacing the entire conditional block with the existing `else` branch logic that all other tabs use.
