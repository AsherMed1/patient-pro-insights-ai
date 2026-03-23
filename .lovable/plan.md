

## Add UFE to Champion Heart and Vascular Center Services

### Problem
The `KNOWN_PROJECT_SERVICES` map in `AppointmentFilters.tsx` only has an entry for Texas Vascular Institute. Champion Heart and Vascular Center was never added, so UFE doesn't appear.

### Fix

**File: `src/components/appointments/AppointmentFilters.tsx` (lines 17-19)**

Add Champion to the static map:

```typescript
const KNOWN_PROJECT_SERVICES: Record<string, string[]> = {
  'Texas Vascular Institute': ['GAE', 'PAD', 'PFE', 'UFE'],
  'Champion Heart and Vascular Center': ['GAE', 'HAE', 'PAE', 'PFE', 'UFE'],
};
```

Single line addition. The existing merge logic on line 176 will automatically include UFE in the services dropdown when Champion is the active project.

