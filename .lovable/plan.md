

## Fix DOB Sync and Auto-Refresh Issues

### Problem 1: DOB changes at the top don't update Demographics and Contact sections
When changing DOB from the header badge, the Demographics age/DOB and Contact DOB don't update visually. The `updateDOB` function in `AllAppointmentsManager` updates local state but the card may not fully re-render the `ParsedIntakeInfo` sub-sections.

### Problem 2: Page auto-refreshes on its own
The `ParsedIntakeInfo` component in the card view has `onUpdate={() => window.location.reload()}` (line 1609 of `AppointmentCard.tsx`), which causes a full browser reload whenever any data is saved from within the Patient Pro Insights section (insurance, contact, PCP edits, or reparse).

### Changes

| File | Change |
|------|--------|
| `src/components/AllAppointmentsManager.tsx` | In `updateDOB`, after updating local state, also call `fetchAppointments()` to ensure the UI fully refreshes with the latest data from the DB (matching how date/time updates work). |
| `src/components/appointments/AppointmentCard.tsx` | Replace `onUpdate={() => window.location.reload()}` on `ParsedIntakeInfo` with `onUpdate={() => { onDataRefresh?.(); }}` to use the targeted refetch pattern instead of a full page reload. |

### Detail

**AllAppointmentsManager.tsx** — add `fetchAppointments()` call in `updateDOB` after the success path (around line 1089):
```typescript
toast({ title: "Success", description: "Date of birth updated successfully" });
fetchAppointments();  // <-- add this
fetchTabCounts();     // <-- add this
onDataChanged?.();
```

**AppointmentCard.tsx** — line 1609, replace:
```typescript
// Before:
onUpdate={() => window.location.reload()}

// After:
onUpdate={() => { onDataRefresh?.(); }}
```

Two files, two small changes. The first ensures DOB changes propagate fully; the second eliminates the unwanted page reload.

