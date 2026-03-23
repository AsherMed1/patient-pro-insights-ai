

## Add UFE to Champion Heart and Vascular Center Service Filter

### Change
Add "Champion Heart and Vascular Center" (or whatever exact project name is used) to the `KNOWN_PROJECT_SERVICES` static map in `AppointmentFilters.tsx`, including UFE alongside their existing services (PAE, PFE, HAE).

**File: `src/components/appointments/AppointmentFilters.tsx` (line 17-19)**

Update the map:
```typescript
const KNOWN_PROJECT_SERVICES: Record<string, string[]> = {
  'Texas Vascular Institute': ['GAE', 'PAD', 'PFE', 'UFE'],
  'Champion Heart and Vascular Center': ['PAE', 'PFE', 'HAE', 'UFE'],
};
```

Single line addition. No other files need changes — the existing merge logic on line 176 will automatically include UFE in the services dropdown when Champion is selected.

