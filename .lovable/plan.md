

## Remove "Virtual" from Service Names (Joint & Vascular Institute)

### Problem
Calendar names like "your GAE Virtual Consultation" produce "GAE Virtual" as a service, and "your HAE Virtual Consultation" produces "HAE Virtual". The word "Virtual" here describes the consultation mode (location), not a distinct service. Services should just be "GAE" and "HAE".

### Fix

**File: `src/components/appointments/AppointmentFilters.tsx` (line 162)**

After extracting the service string, strip trailing " Virtual" before adding to the set:

```typescript
let service = serviceMatch[1].trim();
// Strip " Virtual" suffix — virtual is a location mode, not a service
service = service.replace(/\s+Virtual$/i, '').trim();
// Merge In-person with GAE
if (service.toLowerCase() === 'in-person') {
  service = 'GAE';
}
// "Virtual" alone is a location, not a service
if (service.toLowerCase() === 'virtual') {
  // skip
} else {
  services.add(service);
}
```

This collapses "GAE Virtual" → "GAE" and "HAE Virtual" → "HAE", merging them with their in-person counterparts. The "Virtual" location is already handled by the location extraction on line 128-130.

### Files to Edit
- `src/components/appointments/AppointmentFilters.tsx` — 1 line addition at line 162

