

## Add Imaging Facility Section to Patient Portal

### What
Add an "Imaging Information" section to the Patient Pro Insights panel that displays and allows editing of where the patient had imaging done (facility name) and the facility's phone number.

### Changes

**1. `src/components/appointments/ParsedIntakeInfo.tsx`**
- Add two new state variables: `editImagingFacility` and `editImagingPhone`
- Include these fields in the existing `handleStartEditPCP` / `handleSavePCP` flow (they'll be stored in `parsed_medical_info` alongside PCP data)
- Add display fields for `imaging_facility` and `imaging_phone` in the "Medical & PCP Information" card (read mode)
- Add editable inputs for these fields in edit mode
- The save handler already merges into `parsed_medical_info` via the `update-appointment-fields` edge function — just add the two new keys

**2. `supabase/functions/auto-parse-intake-notes/index.ts`**
- Add `imaging_facility` and `imaging_phone` to the `medical_info` structure (both in the regex parser and GHL custom field extraction)
- Add regex patterns to extract facility/location from intake notes (e.g., "imaging location:", "imaging facility:", "where was imaging done:")
- Add GHL custom field matching for keys containing "imaging location", "imaging facility", "where" + "imaging"

### Technical Detail
- Data stored in `parsed_medical_info` JSONB column as `imaging_facility` and `imaging_phone`
- No database migration needed — JSONB columns accept arbitrary keys
- Editable via the existing pencil-icon edit flow on the Medical & PCP card
- Auto-parsed from GHL data when available, manually editable when not

