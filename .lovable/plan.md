

## Fix: Add "Twin Falls" to Location Dropdown

### Problem
The calendar name format for Vascular Surgery Center of Excellence is `"Request Your GAE Consultation Twin Falls, ID"`. The location extraction regex only handles two patterns:
- `/ - (.+)$/` (e.g., "Name - Twin Falls")
- `/at\s+(.+)$/` (e.g., "Name at Twin Falls")

Since "Twin Falls, ID" appears directly after "Consultation" with just a space (no " - " or " at "), it is never extracted and the location dropdown stays empty.

### Change

| File | Change |
|------|--------|
| `src/components/appointments/AppointmentFilters.tsx` | Add a third regex pattern: `/Consultation\s+(.+)$/i` to extract locations that follow "Consultation" directly |
| `src/components/projects/ProjectDetailedDashboard.tsx` | Same regex addition (duplicated location extraction logic) |

### Technical Detail

In both files, after the existing two regex attempts, add a third fallback:

```typescript
let locationMatch = item.calendar_name.match(/ - (.+)$/);
if (!locationMatch) {
  locationMatch = item.calendar_name.match(/at\s+(.+)$/);
}
if (!locationMatch) {
  locationMatch = item.calendar_name.match(/Consultation\s+(.+)$/i);
}
```

This captures `"Twin Falls, ID"`, which then gets normalized to `"Twin Falls"` by the existing state-abbreviation stripping logic (`location.replace(/,\s*[A-Z]{2}$/, '')`).

No database changes needed. The location will appear automatically in the dropdown for any project whose calendar names follow this pattern.

