

## Add Search Filter and Hide "Call Back Request" Calendars

### Changes

| File | Change |
|------|--------|
| `src/components/appointments/ReserveTimeBlockDialog.tsx` | 1. In `CalendarCheckboxList`, add a search input above the calendar list that filters calendars by name. 2. Filter out calendars whose name contains "Call Back Request" (case-insensitive) before displaying. 3. Make Select All / Deselect All operate on the filtered (visible) list only. |

### Detail

In the `CalendarCheckboxList` component:

1. Add `useState` for a search query string
2. Filter calendars: exclude "Call Back Request" calendars entirely, then filter by search query
3. Add an `<Input>` with a search icon above the checkbox list
4. Select All / Deselect All apply to the currently visible (filtered) calendars only
5. Update the count text to reflect visible vs total

```typescript
// Inside CalendarCheckboxList
const [search, setSearch] = useState('');

const visibleCalendars = calendars
  .filter(c => !c.name.toLowerCase().includes('call back request'))
  .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

const selectAll = () => onSelectionChange([
  ...selectedIds,
  ...visibleCalendars.map(c => c.id).filter(id => !selectedIds.includes(id))
]);
const deselectAll = () => onSelectionChange(
  selectedIds.filter(id => !visibleCalendars.some(c => c.id === id))
);
```

Single file, minimal change.

