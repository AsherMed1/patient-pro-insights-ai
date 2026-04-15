

## Fix: Treat "Virtual" as Location, Not Service

### Problem
- "Virtual GAE", "Virtual Neuropathy" etc. appear as separate service filter options
- This duplicates counts — a Virtual GAE appointment shows under both "Virtual GAE" and "GAE"
- "Virtual" should only be a location filter option, not a service

### Root Cause
`AppointmentFilters.tsx` already has the fix (strips "Virtual" suffix from services, skips bare "Virtual"), but `ProjectDetailedDashboard.tsx` does NOT — it extracts services without any Virtual normalization, and also misses the "Virtual Consultation" → location mapping.

### Changes

**File 1: `src/components/projects/ProjectDetailedDashboard.tsx`** (service/location extraction, lines 102-153)
- Add "Virtual Consultation" → location "Virtual" mapping (same as AppointmentFilters)
- Add parenthesized location format support
- Strip "Virtual" suffix from extracted services (e.g., "Virtual GAE" → "GAE")
- Skip bare "Virtual" as a service
- Merge "In-person" with "GAE" (already done in AppointmentFilters but missing here)

**File 2: `src/components/appointments/AppointmentFilters.tsx`** — already correct, no changes needed

**File 3: `src/components/appointments/calendarUtils.ts`** — already correct (keyword matching handles "Virtual GAE" → GAE), no changes needed

### Result
- Service dropdown: GAE, Neuropathy, PFE, UFE, etc. (no "Virtual GAE" or "Virtual Neuropathy")
- Location dropdown: Virtual, Great Neck, San Antonio, etc.
- Filtering by service "GAE" returns both in-person and virtual GAE appointments (the `.ilike('%GAE%')` query already matches "Virtual GAE Consultation")
- Filtering by location "Virtual" returns only virtual appointments
- Counts are accurate with no duplication

