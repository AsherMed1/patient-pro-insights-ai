# Apply Unscheduled/Time-Preference Capture to ECCO Medical

## Context
Premier Vascular currently supports "unscheduled lead capture" — leads arrive without a booked date/time and instead store a `time_preference` (morning/afternoon/evening/no_preference). The user wants ECCO Medical to behave the same way.

## Changes Required

### 1. Edge Functions — expand project gating
In all three edge functions, replace the single `project_name === 'Premier Vascular'` boolean with a shared constant/Set that includes both **Premier Vascular** and **ECCO Medical**.

- **`supabase/functions/ghl-webhook-handler/index.ts`**
  - `getUpdateableFields()` new-appointment branch (line ~645)
  - `extractTimePreference()` helper already generic, no change needed
  - Contact-enrichment re-extraction block (line ~1338) — currently unconditional, already safe

- **`supabase/functions/all-appointments-api/index.ts`**
  - New-appointment insertion path (line ~184)

- **`supabase/functions/fetch-ghl-contact-data/index.ts`**
  - Time-preference extraction from GHL custom fields (line ~334) — currently unconditional, already safe

### 2. UI — show Time Preference for ECCO Medical
In `src/components/appointments/AppointmentCard.tsx` (line ~1523):
- Change `{appointment.project_name === 'Premier Vascular' && ...}`
- To `{UNSCHEDULED_PROJECTS.includes(appointment.project_name) && ...}`
- Same constant list used in UI and edge functions.

### 3. Documentation
- Update `mem://projects/premier-vascular/unscheduled-capture` to note the shared pattern.
- Create `mem://projects/ecco-medical/unscheduled-capture` documenting ECCO Medical's inclusion.

## Technical Detail
Constant to introduce (shared pattern):
```ts
const UNSCHEDULED_PROJECTS = new Set(['premier vascular', 'ecco medical']);
const isUnscheduled = UNSCHEDULED_PROJECTS.has((projectName || '').trim().toLowerCase());
```

For the UI, use the same constant inline (no shared import needed between frontend and edge functions).