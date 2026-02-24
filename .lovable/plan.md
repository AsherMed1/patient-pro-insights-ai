

## Remove Milledgeville from Premier Vascular Location Filter

### What's Happening

Premier Vascular only has one location (Macon), but the location dropdown is showing "Milledgeville" because some legacy appointments have calendar names containing "Milledgeville". This is the same situation as Fayette Surgical's "Somerset" location, which is already excluded.

### Fix

Add "milledgeville" to the existing location exclusion logic in both files that build the location dropdown options. The current code already excludes "somerset" -- we just extend it to also exclude "milledgeville".

### Files to Change

| File | Change |
|------|--------|
| `src/components/appointments/AppointmentFilters.tsx` (line 136) | Add `milledgeville` to the exclusion check |
| `src/components/projects/ProjectDetailedDashboard.tsx` (line 126) | Add `milledgeville` to the exclusion check |

### Technical Detail

In both files, change the exclusion condition from:

```typescript
if (!normalizedLocation.toLowerCase().includes('somerset')) {
```

to:

```typescript
if (!normalizedLocation.toLowerCase().includes('somerset') && !normalizedLocation.toLowerCase().includes('milledgeville')) {
```

This ensures "Milledgeville" no longer appears in the location filter dropdown for any project, while existing appointment data remains untouched.

